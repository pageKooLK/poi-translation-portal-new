import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/pois - Create a new POI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { klookId, name, googlePlaceId, country, googleMapsData } = body;

    console.log('Received POI creation request:', { klookId, name, country });

    // Validate required fields
    if (!klookId || !name || !googlePlaceId || !country) {
      return NextResponse.json(
        { error: 'Missing required fields: klookId, name, googlePlaceId, country' },
        { status: 400 }
      );
    }

    // Verify Supabase client is initialized
    if (!supabase) {
      console.error('Supabase client not initialized');
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Note: Duplicate Klook IDs are now allowed for re-translation purposes
    console.log('Creating POI (duplicates allowed):', klookId);

    // Insert new POI
    const { data: newPoi, error: insertError } = await supabase
      .from('pois')
      .insert({
        klook_poi_id: klookId,
        klook_poi_name: name,
        google_place_id: googlePlaceId,
        country: country,
        google_maps_data: googleMapsData || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting POI:', insertError);
      return NextResponse.json(
        { error: 'Failed to create POI', details: insertError.message },
        { status: 500 }
      );
    }

    console.log(`POI created successfully: ${klookId} - ${name}`);

    return NextResponse.json({
      success: true,
      poi: newPoi,
      message: 'POI created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create POI API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/pois - Get all POIs with their translations
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const country = url.searchParams.get('country');
    const status = url.searchParams.get('status');
    const language = url.searchParams.get('language');

    // Build query
    let query = supabase
      .from('pois')
      .select(`
        *,
        translations (
          id,
          language_code,
          final_translation,
          status,
          similarity_score,
          needs_manual_check,
          translation_sources (
            source_type,
            recommended_name,
            reasoning,
            confidence_score
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (country && country !== 'all') {
      query = query.eq('country', country);
    }

    const { data: pois, error } = await query;

    if (error) {
      console.error('Error fetching POIs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch POIs', details: error.message },
        { status: 500 }
      );
    }

    // Post-process to filter by translation status or language if needed
    let filteredPois = pois || [];

    if (status && status !== 'all') {
      filteredPois = filteredPois.filter(poi => {
        // Determine POI status based on translations
        const translations = (poi as any).translations || [];
        if (translations.length === 0) return status === 'pending';

        const hasManualReview = translations.some((t: any) => t.status === 'manual_review');
        const hasProcessing = translations.some((t: any) => t.status === 'processing');
        const allCompleted = translations.every((t: any) => t.status === 'completed');

        if (status === 'manual_review') return hasManualReview;
        if (status === 'processing') return hasProcessing;
        if (status === 'completed') return allCompleted && !hasManualReview;
        return false;
      });
    }

    if (language && language !== 'all') {
      // Filter to only include the specific language translation
      filteredPois = filteredPois.map(poi => ({
        ...poi,
        translations: ((poi as any).translations || []).filter((t: any) => t.language_code === language)
      }));
    }

    return NextResponse.json({
      success: true,
      pois: filteredPois,
      count: filteredPois.length
    });

  } catch (error) {
    console.error('Get POIs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
