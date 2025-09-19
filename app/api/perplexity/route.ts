import { NextRequest, NextResponse } from 'next/server';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { poiName, language, context } = await request.json();
    
    if (!poiName || !language) {
      return NextResponse.json(
        { error: 'POI name and language are required' },
        { status: 400 }
      );
    }

    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: 'Perplexity API key is not configured' },
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

    // Construct the prompt for Perplexity
    const prompt = `Translate the following point of interest (POI) name into ${targetLanguage}. 
    
POI Name: "${poiName}"
${context ? `Context: ${context}` : ''}

Please provide:
1. The most accurate translation that maintains the local naming conventions
2. Brief reasoning for your translation choice (2-3 sentences)
3. Any cultural or linguistic considerations

Format your response as JSON with the following structure:
{
  "translation": "translated name",
  "reasoning": "explanation for the translation choice",
  "considerations": "any cultural or linguistic notes"
}`;

    // Call Perplexity API
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator specializing in geographic locations and tourist attractions. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 500,
        return_citations: true,
        return_images: false,
        search_recency_filter: 'month'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Perplexity API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract the response content
    const content = data.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    let parsedResponse;
    try {
      // Extract JSON from the response (in case it's wrapped in markdown or other text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if JSON parsing fails
        parsedResponse = {
          translation: poiName,
          reasoning: 'Unable to parse translation response',
          considerations: ''
        };
      }
    } catch (parseError) {
      console.error('Error parsing Perplexity response:', parseError);
      // Fallback response
      parsedResponse = {
        translation: poiName,
        reasoning: content,
        considerations: ''
      };
    }

    // Return the processed response
    return NextResponse.json({
      success: true,
      translation: parsedResponse.translation || poiName,
      reasoning: parsedResponse.reasoning || 'Translation provided by Perplexity AI with online search context',
      considerations: parsedResponse.considerations || '',
      metadata: {
        model: data.model || 'llama-3.1-sonar-small-128k',
        citations: data.citations || [],
        usage: data.usage || {},
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Perplexity API integration error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch translation from Perplexity', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}