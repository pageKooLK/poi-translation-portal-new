import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/manual-check-queue - Get all pending manual check tasks
 */
export async function GET(request: NextRequest) {
  try {
    // Get all pending items in manual check queue with POI and translation info
    const { data: queueItems, error } = await supabase
      .from('manual_check_queue')
      .select(`
        id,
        poi_id,
        language_code,
        check_type,
        priority,
        current_reviewer,
        metadata,
        created_at,
        pois (
          id,
          klook_poi_id,
          klook_poi_name,
          google_place_id,
          country
        )
      `)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching manual check queue:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Transform to frontend format
    const tasks = await Promise.all((queueItems || []).map(async (item: any) => {
      // Get translation data for this POI and language
      const { data: translation } = await supabase
        .from('translations')
        .select(`
          id,
          final_translation,
          status,
          similarity_score,
          translation_sources (
            source_type,
            recommended_name,
            reasoning,
            confidence_score
          )
        `)
        .eq('poi_id', item.poi_id)
        .eq('language_code', item.language_code)
        .single();

      // Transform translation sources
      const translationSources: any = {};
      if (translation?.translation_sources) {
        translation.translation_sources.forEach((source: any) => {
          translationSources[source.source_type] = {
            text: source.recommended_name,
            reasoning: source.reasoning,
            confidence: source.confidence_score
          };
        });
      }

      return {
        id: item.id,
        type: item.check_type,
        status: 'pending', // Tasks in queue are always pending
        poi: item.pois?.klook_poi_name || 'Unknown POI',
        klookId: item.pois?.klook_poi_id || '',
        country: item.pois?.country || '',
        affectedLanguage: item.language_code,
        priority: item.priority || 0,
        currentReviewer: item.current_reviewer,
        createdAt: item.created_at,
        translationSources: Object.keys(translationSources).length > 0 ? translationSources : null,
        currentTranslation: translation?.final_translation || null,
        similarityScore: translation?.similarity_score || item.metadata?.similarity_score || null,
        metadata: item.metadata
      };
    }));

    return NextResponse.json({
      success: true,
      tasks,
      count: tasks.length
    });

  } catch (error) {
    console.error('Manual check queue API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
