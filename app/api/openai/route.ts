import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { poiName, language, context } = await request.json();
    
    if (!poiName || !language) {
      return NextResponse.json(
        { error: 'POI name and language are required' },
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Map language codes to language names
    const languageMap: { [key: string]: string } = {
      'es-ES': 'Spanish',
      'en-US': 'English',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'pt-PT': 'Portuguese',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Simplified Chinese',
      'zh-TW': 'Traditional Chinese',
      'th-TH': 'Thai',
      'vi-VN': 'Vietnamese',
      'id-ID': 'Indonesian',
      'ms-MY': 'Malay',
      'ar-SA': 'Arabic',
      'ru-RU': 'Russian',
      'nl-NL': 'Dutch',
      'pl-PL': 'Polish',
      'tr-TR': 'Turkish',
      'hi-IN': 'Hindi'
    };

    const targetLanguage = languageMap[language] || language;

    // Construct the system prompt
    const systemPrompt = `You are a professional translator specializing in geographic locations, tourist attractions, and points of interest (POIs). Your task is to provide accurate, culturally appropriate translations that preserve the original meaning while following local naming conventions.

When translating POI names:
1. Maintain official names when they exist
2. Consider cultural significance and local usage
3. Preserve proper nouns when appropriate
4. Use established translations for famous landmarks
5. Provide context for your translation choices

Always respond with valid JSON in the following format:
{
  "translation": "translated name",
  "reasoning": "explanation for translation choice (2-3 sentences)",
  "confidence": "high|medium|low",
  "alternatives": ["alternative 1", "alternative 2"]
}`;

    const userPrompt = `Please translate this POI name into ${targetLanguage}:

POI Name: "${poiName}"
${context ? `Additional Context: ${context}` : ''}

Provide the most accurate translation following local conventions and explain your reasoning.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract the response content
    const content = data.choices[0]?.message?.content || '{}';
    
    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      // Fallback response
      parsedResponse = {
        translation: poiName,
        reasoning: 'Unable to parse translation response from OpenAI',
        confidence: 'low',
        alternatives: []
      };
    }

    // Return the processed response
    return NextResponse.json({
      success: true,
      translation: parsedResponse.translation || poiName,
      reasoning: parsedResponse.reasoning || 'Translation provided by OpenAI GPT-4',
      confidence: parsedResponse.confidence || 'medium',
      alternatives: parsedResponse.alternatives || [],
      metadata: {
        model: data.model || 'gpt-4o',
        usage: data.usage || {},
        timestamp: new Date().toISOString(),
        finish_reason: data.choices[0]?.finish_reason
      }
    });
  } catch (error) {
    console.error('OpenAI API integration error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch translation from OpenAI', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}