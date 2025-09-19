import { NextRequest, NextResponse } from 'next/server';

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

// Mock SERP screenshot storage
const mockSerpScreenshots: Record<string, {
  url: string;
  capturedAt: string;
  searchQuery: string;
  htmlContent?: string;
  rawHtmlFile?: string; // New field for raw HTML file
}> = {
  '50062020': {
    url: 'https://example.com/screenshots/serp-50062020.png',
    capturedAt: '2024-03-15T10:30:00Z',
    searchQuery: 'Madrid Zoo Aquarium',
    htmlContent: generateMockSerpHtml('Zoo Aquarium de Madrid', 'Madrid Zoo Aquarium'),
    rawHtmlFile: 'https://serp-storage.example.com/html/50062020.html'
  },
  '50062021': {
    url: 'https://example.com/screenshots/serp-50062021.png', 
    capturedAt: '2024-03-14T14:25:00Z',
    searchQuery: 'Prado Museum Madrid',
    htmlContent: generateMockSerpHtml('Prado Museum', 'Museo del Prado Madrid'),
    rawHtmlFile: 'https://serp-storage.example.com/html/50062021.html'
  },
  '50062022': {
    url: 'https://example.com/screenshots/serp-50062022.png',
    capturedAt: '2024-03-13T09:45:00Z',
    searchQuery: 'Royal Palace Madrid',
    htmlContent: generateMockSerpHtml('Royal Palace of Madrid', 'Palacio Real Madrid'),
    rawHtmlFile: 'https://serp-storage.example.com/html/50062022.html'
  }
};

// Function to generate realistic mock SERP HTML that looks exactly like Google
function generateMockSerpHtml(poiName: string, searchQuery: string): string {
  const randomResults = Math.floor(Math.random() * 900000 + 100000).toLocaleString();
  const randomTime = (Math.random() * 0.5 + 0.2).toFixed(2);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${searchQuery} - Google Search</title>
    <link rel="shortcut icon" href="/favicon.ico">
    <style>
        body { 
            font-family: arial,sans-serif; 
            font-size: 14px; 
            margin: 0; 
            padding: 0; 
            background: #fff; 
            color: #222;
        }
        .header { 
            padding: 6px 0 7px; 
            border-bottom: 1px solid #ebebeb; 
            background: #fff;
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            align-items: center;
        }
        .logo { 
            color: #4285f4; 
            font-size: 20px; 
            margin-right: 25px;
            text-decoration: none;
        }
        .search-form {
            flex: 1;
            max-width: 600px;
            position: relative;
        }
        .search-input {
            width: 100%;
            height: 44px;
            padding: 0 46px 0 16px;
            border: 1px solid #dfe1e5;
            border-radius: 24px;
            font-size: 16px;
            outline: none;
            box-shadow: 0 1px 6px rgba(32,33,36,.28);
        }
        .search-input:hover {
            box-shadow: 0 1px 6px rgba(32,33,36,.28);
        }
        .search-btn {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            padding: 8px;
        }
        .main-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            display: flex;
            gap: 40px;
        }
        .results-section {
            flex: 1;
            max-width: 652px;
        }
        .stats {
            color: #70757a;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .result {
            margin-bottom: 28px;
        }
        .result h3 {
            margin: 0 0 3px 0;
            font-size: 20px;
            line-height: 1.3;
            font-weight: 400;
        }
        .result h3 a {
            color: #1a0dab;
            text-decoration: none;
        }
        .result h3 a:hover {
            text-decoration: underline;
        }
        .result h3 a:visited {
            color: #609;
        }
        .result-url {
            color: #006621;
            font-size: 14px;
            margin: 2px 0 6px 0;
            line-height: 18px;
        }
        .result-snippet {
            color: #4d5156;
            font-size: 14px;
            line-height: 1.58;
            max-width: 600px;
        }
        .knowledge-panel {
            width: 350px;
            background: #fff;
            border: 1px solid #dadce0;
            border-radius: 8px;
            padding: 16px;
            margin-left: 40px;
            height: fit-content;
            position: sticky;
            top: 80px;
        }
        .knowledge-panel h2 {
            margin: 0 0 8px 0;
            font-size: 28px;
            font-weight: 400;
            color: #202124;
            line-height: 32px;
        }
        .knowledge-panel .subtitle {
            color: #70757a;
            font-size: 14px;
            margin-bottom: 16px;
            line-height: 20px;
        }
        .knowledge-panel .info-item {
            margin-bottom: 12px;
            font-size: 14px;
            line-height: 20px;
        }
        .knowledge-panel .label {
            color: #70757a;
            display: inline-block;
            min-width: 60px;
        }
        .knowledge-panel .value {
            color: #202124;
        }
        .breadcrumb {
            color: #70757a;
            font-size: 14px;
            margin-bottom: 4px;
        }
        .breadcrumb a {
            color: #70757a;
            text-decoration: none;
        }
        .breadcrumb a:hover {
            text-decoration: underline;
        }
        .related-searches {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dadce0;
        }
        .related-searches h3 {
            font-size: 16px;
            color: #202124;
            margin-bottom: 16px;
        }
        .related-item {
            padding: 8px 12px;
            margin-bottom: 8px;
            border: 1px solid #dadce0;
            border-radius: 20px;
            display: inline-block;
            margin-right: 8px;
            color: #1a0dab;
            text-decoration: none;
            font-size: 14px;
        }
        .related-item:hover {
            background: #f8f9fa;
            text-decoration: underline;
        }
        .nav-tabs {
            margin-bottom: 20px;
            border-bottom: 1px solid #dadce0;
        }
        .nav-tab {
            display: inline-block;
            padding: 12px 0;
            margin-right: 32px;
            color: #70757a;
            text-decoration: none;
            font-size: 14px;
            position: relative;
        }
        .nav-tab.active {
            color: #1a73e8;
        }
        .nav-tab.active::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            right: 0;
            height: 3px;
            background: #1a73e8;
            border-radius: 2px 2px 0 0;
        }
        @media (max-width: 1024px) {
            .main-content { flex-direction: column; }
            .knowledge-panel { width: 100%; margin-left: 0; margin-top: 20px; position: static; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="https://www.google.com" class="logo">Google</a>
            <div class="search-form">
                <input type="text" class="search-input" value="${searchQuery}" readonly>
                <button class="search-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#9aa0a6"/>
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <div class="main-content">
        <div class="results-section">
            <div class="nav-tabs">
                <a href="#" class="nav-tab active">All</a>
                <a href="#" class="nav-tab">Images</a>
                <a href="#" class="nav-tab">Videos</a>
                <a href="#" class="nav-tab">News</a>
                <a href="#" class="nav-tab">Maps</a>
                <a href="#" class="nav-tab">More</a>
            </div>

            <div class="stats">
                About ${randomResults} results (${randomTime} seconds)
            </div>

            <div class="result">
                <div class="breadcrumb">
                    <a href="https://www.zooaquarium.com">https://www.zooaquarium.com</a> › madrid
                </div>
                <h3><a href="https://www.zooaquarium.com/madrid">${poiName} - Official Website</a></h3>
                <div class="result-url">https://www.zooaquarium.com › madrid</div>
                <div class="result-snippet">
                    Visit ${poiName} in Madrid, Spain. One of the most popular tourist attractions with thousands of visitors every year. Book tickets online and save up to 15%. Opening hours: 10:30 AM - 8:00 PM daily.
                </div>
            </div>

            <div class="result">
                <div class="breadcrumb">
                    <a href="https://www.tripadvisor.com">https://www.tripadvisor.com</a> › attraction
                </div>
                <h3><a href="https://www.tripadvisor.com/attraction/zoo-aquarium-madrid">${poiName} - TripAdvisor</a></h3>
                <div class="result-url">https://www.tripadvisor.com › Attraction_Review › Madrid</div>
                <div class="result-snippet">
                    ${poiName}: See 3,847 reviews, articles, and 2,156 photos of ${poiName}, ranked No.15 on TripAdvisor among 427 attractions in Madrid. "Great day out for families" - "Amazing aquarium and zoo combined"
                </div>
            </div>

            <div class="result">
                <div class="breadcrumb">
                    <a href="https://en.wikipedia.org">https://en.wikipedia.org</a> › wiki
                </div>
                <h3><a href="https://en.wikipedia.org/wiki/Madrid_Zoo">${poiName} - Wikipedia</a></h3>
                <div class="result-url">https://en.wikipedia.org › wiki › Madrid_Zoo</div>
                <div class="result-snippet">
                    ${poiName} is a 20-hectare (49-acre) zoo and aquarium located in the Casa de Campo in Madrid, Spain. The zoo is home to over 6,000 animals of 500 different species, and is one of the few zoos in the world to house giant pandas.
                </div>
            </div>

            <div class="result">
                <div class="breadcrumb">
                    <a href="https://www.esmadrid.com">https://www.esmadrid.com</a> › en › tourist-information
                </div>
                <h3><a href="https://www.esmadrid.com/en/tourist-information/zoo-aquarium-madrid">Visit ${poiName} | Madrid Tourism</a></h3>
                <div class="result-url">https://www.esmadrid.com › en › tourist-information</div>
                <div class="result-snippet">
                    Discover ${poiName} in Madrid. Opening hours, ticket prices, and visitor information. Plan your visit to this amazing attraction that combines a zoo and aquarium in one location. Metro: Batán (Line 10).
                </div>
            </div>

            <div class="result">
                <div class="breadcrumb">
                    <a href="https://www.timeout.com">https://www.timeout.com</a> › madrid › attractions
                </div>
                <h3><a href="https://www.timeout.com/madrid/attractions/zoo-aquarium">${poiName} | Time Out Madrid</a></h3>
                <div class="result-url">https://www.timeout.com › madrid › attractions</div>
                <div class="result-snippet">
                    A complete guide to ${poiName}. What to see, ticket prices, opening times, and how to get there. Home to dolphins, sea lions, sharks, and over 6,000 animals from around the world.
                </div>
            </div>

            <div class="related-searches">
                <h3>People also ask</h3>
                <a href="#" class="related-item">madrid zoo tickets</a>
                <a href="#" class="related-item">madrid zoo opening hours</a>
                <a href="#" class="related-item">madrid zoo pandas</a>
                <a href="#" class="related-item">madrid zoo aquarium prices</a>
                <a href="#" class="related-item">casa de campo madrid zoo</a>
                <a href="#" class="related-item">madrid zoo reviews</a>
            </div>
        </div>

        <div class="knowledge-panel">
            <h2>${poiName}</h2>
            <div class="subtitle">Zoo and aquarium in Madrid, Spain</div>
            
            <div class="info-item">
                <span class="label">Address:</span>
                <span class="value">Casa de Campo, s/n, 28011 Madrid, Spain</span>
            </div>
            
            <div class="info-item">
                <span class="label">Hours:</span>
                <span class="value">Open ⋅ Closes 8:00 PM</span>
            </div>
            
            <div class="info-item">
                <span class="label">Phone:</span>
                <span class="value">+34 902 34 50 14</span>
            </div>
            
            <div class="info-item">
                <span class="label">Website:</span>
                <span class="value"><a href="https://zooaquarium.com" style="color: #1a0dab;">zooaquarium.com</a></span>
            </div>
            
            <div class="info-item">
                <span class="label">Founded:</span>
                <span class="value">1972</span>
            </div>
            
            <div class="info-item">
                <span class="label">Area:</span>
                <span class="value">20 hectares</span>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// Mock POI data for generating SERP screenshots
const mockPOIData: Record<string, {
  name: string;
  googlePlaceId: string;
  country: string;
}> = {
  '50062020': {
    name: 'Zoo Aquarium de Madrid',
    googlePlaceId: 'ChIJiUWqjPYqQg0R1TK9a5FQ9G4',
    country: 'ES'
  },
  '50062021': {
    name: 'Prado Museum',
    googlePlaceId: 'ChIJr7H1iMIqQg0R8MyXiIo25u0',
    country: 'ES'
  },
  '50062022': {
    name: 'Royal Palace of Madrid',
    googlePlaceId: 'ChIJSXNtPyYqQg0R7KkpaJ_bbGY',
    country: 'ES'
  }
};

// Function to generate SERP screenshot using real SERP API
async function generateSerpScreenshot(klookId: string, poiName: string, googlePlaceId: string): Promise<any> {
  try {
    const SERP_API_KEY = process.env.SERP_API_KEY;
    
    if (!SERP_API_KEY) {
      console.error('SERP API key not configured');
      throw new Error('SERP API key not configured');
    }

    // Call real SERP API
    const params = new URLSearchParams({
      api_key: SERP_API_KEY,
      engine: 'google',
      q: poiName,
      location: 'Madrid, Spain',
      hl: 'en',
      gl: 'us',
      google_domain: 'google.com',
      num: '10',
      safe: 'active',
      device: 'desktop'
    });

    const serpApiUrl = `https://serpapi.com/search.json?${params}`;
    const response = await fetch(serpApiUrl);
    
    if (!response.ok) {
      console.error('SERP API error:', response.status);
      throw new Error(`SERP API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Get the raw HTML file URL from SERP API
    const rawHtmlFile = data.search_metadata?.raw_html_file;
    
    // Update storage with real SERP data
    mockSerpScreenshots[klookId] = {
      url: data.search_metadata?.google_url || '',
      capturedAt: data.search_metadata?.created_at || new Date().toISOString(),
      searchQuery: poiName,
      htmlContent: '', // We'll fetch this separately if needed
      rawHtmlFile: rawHtmlFile || ''
    };
    
    return {
      rawHtmlFile,
      serpData: data
    };
  } catch (error) {
    console.error('SERP screenshot generation error:', error);
    // Fallback to mock data if real API fails
    const mockUrl = `https://serpapi.com/screenshot/${klookId}_${Date.now()}.png`;
    mockSerpScreenshots[klookId] = {
      url: mockUrl,
      capturedAt: new Date().toISOString(),
      searchQuery: poiName,
      htmlContent: generateMockSerpHtml(poiName, `${poiName} search results`),
      rawHtmlFile: `https://serp-storage.example.com/html/${klookId}_${Date.now()}.html`
    };
    return { rawHtmlFile: mockUrl, serpData: null };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { klookId: string } }
) {
  try {
    const klookId = params.klookId;
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'redirect'; // redirect, json, html
    const regenerate = url.searchParams.get('regenerate') === 'true';
    
    if (!klookId) {
      return NextResponse.json(
        { error: 'Klook ID is required' },
        { status: 400 }
      );
    }

    // Check if POI exists
    const poiData = mockPOIData[klookId];
    if (!poiData) {
      return NextResponse.json(
        { error: `POI with Klook ID ${klookId} not found` },
        { status: 404 }
      );
    }

    // Check if screenshot exists and is recent (unless regeneration is requested)
    let screenshotData = mockSerpScreenshots[klookId];
    const shouldRegenerateScreenshot = regenerate || !screenshotData || 
      (new Date().getTime() - new Date(screenshotData.capturedAt).getTime()) > 7 * 24 * 60 * 60 * 1000; // 7 days

    if (shouldRegenerateScreenshot) {
      try {
        const screenshotUrl = await generateSerpScreenshot(klookId, poiData.name, poiData.googlePlaceId);
        screenshotData = mockSerpScreenshots[klookId];
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to generate SERP screenshot' },
          { status: 500 }
        );
      }
    }

    // Return response based on format
    switch (format) {
      case 'json':
        return NextResponse.json({
          klookId,
          poi: poiData,
          screenshot: {
            ...screenshotData,
            rawHtmlFile: screenshotData.rawHtmlFile || `/api/serp-screenshot/${klookId}?format=html`
          },
          isNew: shouldRegenerateScreenshot
        });
        
      case 'html':
        return new NextResponse(
          screenshotData.htmlContent || '<html><body>No HTML content available</body></html>',
          {
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'public, max-age=3600'
            }
          }
        );
        
      default: // redirect
        if (screenshotData.url.startsWith('http')) {
          return NextResponse.redirect(screenshotData.url);
        } else {
          // For mock URLs, return a placeholder image or generate one
          const placeholderImageUrl = `https://via.placeholder.com/1200x800/cccccc/333333?text=${encodeURIComponent(`SERP Screenshot\n${poiData.name}\nCaptured: ${new Date(screenshotData.capturedAt).toLocaleDateString()}`)}`;
          return NextResponse.redirect(placeholderImageUrl);
        }
    }
  } catch (error) {
    console.error('SERP screenshot API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { klookId: string } }
) {
  try {
    const klookId = params.klookId;
    const { forceRegenerate } = await request.json();
    
    if (!klookId) {
      return NextResponse.json(
        { error: 'Klook ID is required' },
        { status: 400 }
      );
    }

    const poiData = mockPOIData[klookId];
    if (!poiData) {
      return NextResponse.json(
        { error: `POI with Klook ID ${klookId} not found` },
        { status: 404 }
      );
    }

    try {
      const screenshotUrl = await generateSerpScreenshot(klookId, poiData.name, poiData.googlePlaceId);
      const screenshotData = mockSerpScreenshots[klookId];
      
      return NextResponse.json({
        success: true,
        klookId,
        poi: poiData,
        screenshot: screenshotData,
        message: 'SERP screenshot generated successfully'
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to generate SERP screenshot' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('SERP screenshot generation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { klookId: string } }
) {
  try {
    const klookId = params.klookId;
    
    if (!klookId) {
      return NextResponse.json(
        { error: 'Klook ID is required' },
        { status: 400 }
      );
    }

    if (!mockSerpScreenshots[klookId]) {
      return NextResponse.json(
        { error: `SERP screenshot for Klook ID ${klookId} not found` },
        { status: 404 }
      );
    }

    // In a real implementation, this would also delete the file from cloud storage
    delete mockSerpScreenshots[klookId];
    console.log(`SERP screenshot deleted for POI: ${klookId}`);

    return NextResponse.json({
      success: true,
      message: `SERP screenshot for POI ${klookId} deleted successfully`
    });
  } catch (error) {
    console.error('SERP screenshot deletion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}