import { NextRequest, NextResponse } from 'next/server';
import { generateOpenRouterPrompt } from './language-mappings';

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Model configurations for OpenRouter
const OPENROUTER_MODELS = {
  gpt4_turbo: {
    id: 'openai/gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    sourceType: 'openrouter_gpt4_turbo',
  },
  claude_sonnet: {
    id: 'anthropic/claude-3.5-sonnet',
    displayName: 'Claude 3.5 Sonnet',
    sourceType: 'openrouter_claude_sonnet',
  },
  gemini_flash: {
    id: 'google/gemini-2.0-flash-exp:free',
    displayName: 'Gemini 2.5 Flash Lite',
    sourceType: 'openrouter_gemini_flash',
  },
  gpt5_nano: {
    id: 'openai/gpt-4o-mini', // Fallback to gpt-4o-mini as gpt-5-nano may not exist yet
    displayName: 'GPT-4o Mini',
    sourceType: 'openrouter_gpt5_nano',
  },
  sonar_pro: {
    id: 'mistralai/mistral-7b-instruct',
    displayName: 'Mistral 7B',
    sourceType: 'openrouter_sonar_pro',
  },
};

interface TranslationRequest {
  poiName: string;
  language: string;
  country?: string;
  models?: string[]; // Optional: specify which models to use
}

interface ModelTranslationResult {
  translation: string;
  reasoning: string;
  confidence: number;
  rawResponse?: any;
  error?: string;
}

/**
 * Call OpenRouter API for a specific model
 */
async function callOpenRouterModel(
  modelId: string,
  modelName: string,
  prompt: string,
  timeout: number = 25000
): Promise<ModelTranslationResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    console.log(`[OpenRouter] Calling model: ${modelName} (${modelId})`);

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://poi-translation-portal.vercel.app', // Optional: for rankings
        'X-Title': 'POI Translation Portal', // Optional: for display in rankings
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Deterministic output
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpenRouter] ${modelName} API error:`, response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[OpenRouter] ${modelName} raw response:`, JSON.stringify(data, null, 2));

    // Extract the content from OpenRouter response
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      throw new Error('Empty response from model');
    }

    // Parse the JSON array response
    let translation = '';
    let reasoning = `Translation from ${modelName}`;
    let jsonMatch = null;

    try {
      // Try to extract JSON array from the response
      // Use [\s\S] instead of . with s flag for ES5 compatibility
      jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsedArray = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          translation = parsedArray[0];
        } else if (Array.isArray(parsedArray) && parsedArray.length === 0) {
          translation = ''; // No common translation exists
          reasoning = `${modelName}: No commonly used local name found`;
        }
      } else {
        // Fallback: use the content directly if it's not a JSON array
        translation = content.trim();
        reasoning = `${modelName}: Direct translation (non-JSON response)`;
      }
    } catch (parseError) {
      console.warn(`[OpenRouter] ${modelName} JSON parse error, using raw content:`, parseError);
      translation = content.trim();
      reasoning = `${modelName}: Parsed from text response`;
    }

    // Calculate confidence based on response characteristics
    let confidence = 0.75; // Base confidence
    if (translation.length > 0 && translation.length < 50) {
      confidence = 0.85; // Good length
    }
    if (jsonMatch) {
      confidence += 0.05; // Bonus for proper JSON format
    }

    return {
      translation: translation || 'Translation not available',
      reasoning: reasoning,
      confidence: Math.min(confidence, 0.95),
      rawResponse: data,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`[OpenRouter] ${modelName} error:`, error);

    return {
      translation: 'Translation failed',
      reasoning: `${modelName}: ${error.message || 'Unknown error'}`,
      confidence: 0,
      error: error.message,
    };
  }
}

/**
 * Main POST handler for OpenRouter translations
 */
export async function POST(request: NextRequest) {
  try {
    const body: TranslationRequest = await request.json();
    const { poiName, language, country, models } = body;

    // Validate required fields
    if (!poiName || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: poiName and language' },
        { status: 400 }
      );
    }

    // Check API key
    if (!OPENROUTER_API_KEY) {
      console.error('[OpenRouter] API key not configured');
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    console.log(`[OpenRouter] Translation request for "${poiName}" to ${language}`);

    // Generate the prompt
    const prompt = generateOpenRouterPrompt(poiName, language, country);
    console.log(`[OpenRouter] Generated prompt:\n${prompt}`);

    // Determine which models to use
    const modelsToUse = models && models.length > 0
      ? models
      : Object.keys(OPENROUTER_MODELS); // Use all models by default

    // Call all specified models in parallel
    const modelPromises = modelsToUse.map(async (modelKey) => {
      const modelConfig = OPENROUTER_MODELS[modelKey as keyof typeof OPENROUTER_MODELS];
      if (!modelConfig) {
        console.warn(`[OpenRouter] Unknown model key: ${modelKey}`);
        return { modelKey, result: null };
      }

      const result = await callOpenRouterModel(
        modelConfig.id,
        modelConfig.displayName,
        prompt
      );

      return {
        modelKey,
        modelConfig,
        result,
      };
    });

    const results = await Promise.all(modelPromises);

    // Format the response
    const translations: Record<string, any> = {};
    const reasoning: Record<string, string> = {};
    const confidence: Record<string, number> = {};
    const errors: Record<string, string> = {};

    results.forEach(({ modelKey, modelConfig, result }) => {
      if (result && modelConfig) {
        translations[modelConfig.sourceType] = result.translation;
        reasoning[modelConfig.sourceType] = result.reasoning;
        confidence[modelConfig.sourceType] = result.confidence;
        if (result.error) {
          errors[modelConfig.sourceType] = result.error;
        }
      }
    });

    console.log(`[OpenRouter] Successfully processed ${results.length} models`);

    return NextResponse.json({
      success: true,
      translations,
      reasoning,
      confidence,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      metadata: {
        poiName,
        language,
        country,
        modelsUsed: results.map(r => r.modelConfig?.displayName).filter(Boolean),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[OpenRouter] Request error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process translation request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
