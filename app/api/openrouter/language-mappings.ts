/**
 * OpenRouter Language and Country Mappings
 * Used for generating localized prompts for AI translation models
 */

// Language code to natural language name mapping
export const OPENROUTER_LANGUAGE_NAMES: Record<string, string> = {
  'ZH-CN': 'Simplified Chinese',
  'ZH-TW': 'Traditional Chinese',
  'JA-JP': 'Japanese',
  'KO-KR': 'Korean',
  'TH-TH': 'Thai',
  'VI-VN': 'Vietnamese',
  'ID-ID': 'Indonesian',
  'MS-MY': 'Malay',
  'EN-US': 'English (United States)',
  'EN-GB': 'English (United Kingdom)',
  'FR-FR': 'French',
  'DE-DE': 'German',
  'IT-IT': 'Italian',
  'PT-BR': 'Portuguese (Brazil)',
};

// Country/region names for context in translation prompts
export const COUNTRY_REGION_NAMES: Record<string, string> = {
  'JP': 'Japan',
  'CN': 'China',
  'TW': 'Taiwan',
  'HK': 'Hong Kong',
  'KR': 'South Korea',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'ID': 'Indonesia',
  'MY': 'Malaysia',
  'SG': 'Singapore',
  'US': 'United States',
  'GB': 'United Kingdom',
  'FR': 'France',
  'DE': 'Germany',
  'IT': 'Italy',
  'BR': 'Brazil',
  'AU': 'Australia',
  'NZ': 'New Zealand',
  'PH': 'Philippines',
  'IN': 'India',
};

// Language-specific region variations
export const LANGUAGE_REGION_MAPPING: Record<string, string> = {
  'ZH-CN': 'China',
  'ZH-TW': 'Taiwan',
  'JA-JP': 'Japan',
  'KO-KR': 'South Korea',
  'TH-TH': 'Thailand',
  'VI-VN': 'Vietnam',
  'ID-ID': 'Indonesia',
  'MS-MY': 'Malaysia',
  'EN-US': 'United States',
  'EN-GB': 'United Kingdom',
  'FR-FR': 'France',
  'DE-DE': 'Germany',
  'IT-IT': 'Italy',
  'PT-BR': 'Brazil',
};

/**
 * Generate the translation prompt for OpenRouter models
 * @param poiName - Original POI name
 * @param language - Target language code (e.g., 'ZH-TW')
 * @param country - Target country/region (optional, will use language default if not provided)
 * @returns Formatted prompt string
 */
export function generateOpenRouterPrompt(
  poiName: string,
  language: string,
  country?: string
): string {
  const targetLanguage = OPENROUTER_LANGUAGE_NAMES[language] || 'English';
  const targetRegion = country
    ? (COUNTRY_REGION_NAMES[country] || country)
    : LANGUAGE_REGION_MAPPING[language];

  return `You are helping localize a travel product.

Please translate the following place name into the most commonly used and natural name in ${targetLanguage}, as spoken or searched by local people in ${targetRegion}.

Guidelines:

- Avoid official or overly literal translations that locals don't commonly use.
- Do NOT use translations from commercial travel platforms like Klook, KKday, or Trip.com.
- Use what locals actually say or type when referring to the place (e.g. YouTube titles, Google searches, map labels).
- If there is no commonly used name, return an empty array.
- Output only a flat JSON array with the translated name as a single string.
- Do NOT include the original input name, explanation, or any other metadata.

Place name: ${poiName}

Target language: ${targetLanguage}
Target country/region: ${targetRegion}

Expected output format:
["translated name"]

or if no common translation exists:
[]`;
}

/**
 * Get user-friendly display name for language code
 */
export function getLanguageDisplayName(languageCode: string): string {
  return OPENROUTER_LANGUAGE_NAMES[languageCode] || languageCode;
}

/**
 * Get user-friendly display name for country code
 */
export function getCountryDisplayName(countryCode: string): string {
  return COUNTRY_REGION_NAMES[countryCode] || countryCode;
}
