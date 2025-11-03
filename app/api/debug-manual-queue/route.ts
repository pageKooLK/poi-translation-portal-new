import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Debug endpoint to check manual_check_queue
 * GET /api/debug-manual-queue
 */
export async function GET(request: NextRequest) {
  try {
    // Get all items in manual check queue
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
          klook_poi_id,
          klook_poi_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching manual check queue:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get statistics
    const stats = {
      totalItems: queueItems?.length || 0,
      uniquePOIs: new Set(queueItems?.map(item => item.poi_id)).size,
      uniqueLanguages: new Set(queueItems?.map(item => item.language_code)).size,
      byLanguage: {} as any,
      byCheckType: {} as any
    };

    if (queueItems) {
      queueItems.forEach(item => {
        // Count by language
        stats.byLanguage[item.language_code] = (stats.byLanguage[item.language_code] || 0) + 1;
        // Count by check type
        stats.byCheckType[item.check_type] = (stats.byCheckType[item.check_type] || 0) + 1;
      });
    }

    return NextResponse.json({
      success: true,
      stats,
      items: queueItems || []
    });

  } catch (error) {
    console.error('Debug manual queue API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
