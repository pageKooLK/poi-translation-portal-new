import { NextRequest, NextResponse } from 'next/server';

const SERP_API_KEY = process.env.SERP_API_KEY;

// Complete localization settings for 14 supported languages
const SERP_LOCALIZATION_CONFIG: Record<string, {
  hl: string;       // Interface language
  gl: string;       // Country for results
  google_domain: string; // Google domain to use
  location?: string;     // Default location for this market
}> = {
  'ZH-CN': { hl: 'zh-cn', gl: 'cn', google_domain: 'google.com.hk', location: 'Beijing,China' },
  'ZH-TW': { hl: 'zh-tw', gl: 'tw', google_domain: 'google.com.tw', location: 'Taipei,Taiwan' },
  'JA-JP': { hl: 'ja', gl: 'jp', google_domain: 'google.co.jp', location: 'Tokyo,Japan' },
  'KO-KR': { hl: 'ko', gl: 'kr', google_domain: 'google.co.kr', location: 'Seoul,South Korea' },
  'TH-TH': { hl: 'th', gl: 'th', google_domain: 'google.co.th', location: 'Bangkok,Thailand' },
  'VI-VN': { hl: 'vi', gl: 'vn', google_domain: 'google.com.vn', location: 'Ho Chi Minh City,Vietnam' },
  'ID-ID': { hl: 'id', gl: 'id', google_domain: 'google.co.id', location: 'Jakarta,Indonesia' },
  'MS-MY': { hl: 'ms', gl: 'my', google_domain: 'google.com.my', location: 'Kuala Lumpur,Malaysia' },
  'EN-US': { hl: 'en', gl: 'us', google_domain: 'google.com', location: 'New York,United States' },
  'EN-GB': { hl: 'en', gl: 'gb', google_domain: 'google.co.uk', location: 'London,United Kingdom' },
  'FR-FR': { hl: 'fr', gl: 'fr', google_domain: 'google.fr', location: 'Paris,France' },
  'DE-DE': { hl: 'de', gl: 'de', google_domain: 'google.de', location: 'Berlin,Germany' },
  'IT-IT': { hl: 'it', gl: 'it', google_domain: 'google.it', location: 'Rome,Italy' },
  'PT-BR': { hl: 'pt', gl: 'br', google_domain: 'google.com.br', location: 'São Paulo,Brazil' }
};

export async function POST(request: NextRequest) {
  try {
    const { query, location, language = 'EN-US', engine = 'google' } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    if (!SERP_API_KEY) {
      return NextResponse.json(
        { error: 'SERP API key is not configured' },
        { status: 500 }
      );
    }

    // Get localization settings for the target language
    const localizationConfig = SERP_LOCALIZATION_CONFIG[language.toUpperCase()] || SERP_LOCALIZATION_CONFIG['EN-US'];
    
    // Use provided location or fall back to language-specific default location
    const searchLocation = location || localizationConfig.location || 'Madrid, Spain';

    console.log(`SERP API Localization: language=${language}, config=`, localizationConfig);

    // Build SERP API URL with proper localization
    const params = new URLSearchParams({
      api_key: SERP_API_KEY,
      engine: engine, // Use dynamic engine (google, google_maps, etc.)
      q: query,
      location: searchLocation,
      hl: localizationConfig.hl,           // Interface language
      gl: localizationConfig.gl,           // Country for results
      google_domain: localizationConfig.google_domain  // Localized Google domain
    });

    // Add engine-specific parameters
    if (engine === 'google') {
      params.append('num', '10');
      params.append('start', '0');
      params.append('safe', 'active');
      params.append('device', 'desktop');
    } else if (engine === 'google_maps') {
      // Google Maps specific parameters
      params.append('type', 'search');
    }

    const serpApiUrl = `https://serpapi.com/search.json?${params}`;
    
    console.log('Calling SERP API:', serpApiUrl.replace(SERP_API_KEY, 'API_KEY_HIDDEN'));

    // Call real SERP API
    const response = await fetch(serpApiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('SERP API error:', response.status, errorText);
      return NextResponse.json(
        { error: `SERP API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract the raw HTML file URL if available
    const rawHtmlFile = data.search_metadata?.raw_html_file;
    
    // Process and return the data based on engine type
    const baseResponse = {
      success: true,
      search_metadata: data.search_metadata,
      search_parameters: data.search_parameters,
      raw_html_file: rawHtmlFile,
      engine: engine
    };

    if (engine === 'google_maps') {
      // Google Maps specific response structure
      return NextResponse.json({
        ...baseResponse,
        local_results: data.local_results,
        place_results: data.place_results,
        search_information: data.search_information,
        processed: {
          total_results: data.search_information?.total_results,
          places_found: data.local_results?.length || 0,
          main_place: data.place_results ? {
            name: data.place_results.title,
            address: data.place_results.address,
            phone: data.place_results.phone,
            website: data.place_results.website,
            rating: data.place_results.rating,
            reviews: data.place_results.reviews,
            hours: data.place_results.hours,
            place_id: data.place_results.place_id
          } : null,
          nearby_places: data.local_results?.slice(0, 5).map((place: any) => ({
            title: place.title,
            address: place.address,
            rating: place.rating,
            type: place.type
          }))
        }
      });
    } else {
      // Standard Google search response structure
      return NextResponse.json({
        ...baseResponse,
        search_information: data.search_information,
        knowledge_graph: data.knowledge_graph,
        organic_results: data.organic_results,
        related_searches: data.related_searches,
        processed: {
          total_results: data.search_information?.total_results,
          time_taken: data.search_information?.time_taken_displayed,
          poi_info: data.knowledge_graph ? {
            name: data.knowledge_graph.title,
            description: data.knowledge_graph.description,
            address: data.knowledge_graph.address,
            phone: data.knowledge_graph.phone,
            website: data.knowledge_graph.website,
            rating: data.knowledge_graph.rating,
            reviews: data.knowledge_graph.review_count,
            hours: data.knowledge_graph.hours,
            place_id: data.knowledge_graph.place_id
          } : null,
          top_results: data.organic_results?.slice(0, 5).map((result: any) => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
            displayed_link: result.displayed_link
          }))
        }
      });
    }
  } catch (error) {
    console.error('SERP API integration error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SERP data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch raw HTML from SERP API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const htmlUrl = searchParams.get('html_url');
    
    if (!htmlUrl) {
      return NextResponse.json(
        { error: 'HTML URL is required' },
        { status: 400 }
      );
    }

    // Fetch the raw HTML from SERP API
    const response = await fetch(htmlUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch HTML: ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error fetching SERP HTML:', error);
    return NextResponse.json(
      { error: 'Failed to fetch HTML content' },
      { status: 500 }
    );
  }
}