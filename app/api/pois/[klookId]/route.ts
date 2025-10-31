import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { klookId: string } }
) {
  try {
    const { klookId } = params;

    if (!klookId) {
      return NextResponse.json(
        { error: 'POI ID is required' },
        { status: 400 }
      );
    }

    console.log(`Backend: Deleting POI with Klook ID: ${klookId}`);

    // Delete POI from database (translations will be cascade deleted due to FK constraint)
    const { data, error } = await supabase
      .from('pois')
      .delete()
      .eq('klook_poi_id', klookId)
      .select();

    if (error) {
      console.error('Database error deleting POI:', error);
      return NextResponse.json(
        {
          error: 'Failed to delete POI from database',
          details: error.message
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: `POI with Klook ID ${klookId} not found` },
        { status: 404 }
      );
    }

    console.log(`Backend: POI ${klookId} successfully deleted`);

    return NextResponse.json({
      success: true,
      message: `POI ${klookId} and all its translations have been successfully deleted`,
      deletedId: klookId,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Backend: Error deleting POI:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete POI from database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve specific POI with all translations
export async function GET(
  request: NextRequest,
  { params }: { params: { klookId: string } }
) {
  try {
    const { klookId } = params;

    if (!klookId) {
      return NextResponse.json(
        { error: 'POI ID is required' },
        { status: 400 }
      );
    }

    // Fetch POI with all its translations and sources
    const { data: poi, error } = await supabase
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
          created_at,
          updated_at,
          translation_sources (
            source_type,
            recommended_name,
            reasoning,
            confidence_score,
            raw_data
          )
        )
      `)
      .eq('klook_poi_id', klookId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: `POI with Klook ID ${klookId} not found` },
          { status: 404 }
        );
      }
      console.error('Error fetching POI:', error);
      return NextResponse.json(
        { error: 'Failed to fetch POI details', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      poi
    });

  } catch (error) {
    console.error('Error fetching POI:', error);
    return NextResponse.json(
      { error: 'Failed to fetch POI details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}