import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Test API endpoint to simulate the entire translation workflow
 * POST /api/test-translation
 *
 * This endpoint:
 * 1. Creates a test POI in the database
 * 2. Generates mock translations for all 14 languages
 * 3. Calls the batch save API to persist translations
 * 4. Returns detailed logs of the entire process
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];

  try {
    // Parse request body
    const { klookId, name, googlePlaceId, country } = await request.json();

    logs.push(`[${new Date().toISOString()}] Starting test translation workflow`);
    logs.push(`POI: ${name} (${klookId})`);

    // Step 1: Create POI in database
    logs.push(`\n[STEP 1] Creating POI in database...`);

    const { data: existingPoi } = await supabase
      .from('pois')
      .select('id, klook_poi_id')
      .eq('klook_poi_id', klookId)
      .single();

    if (existingPoi) {
      logs.push(`⚠️ POI already exists with ID: ${existingPoi.id}`);
      logs.push(`Deleting existing POI to run fresh test...`);

      // Delete existing POI (cascade will delete translations)
      await supabase
        .from('pois')
        .delete()
        .eq('klook_poi_id', klookId);

      logs.push(`✅ Deleted existing POI`);
    }

    const { data: newPoi, error: createError } = await supabase
      .from('pois')
      .insert({
        klook_poi_id: klookId,
        klook_poi_name: name,
        google_place_id: googlePlaceId,
        country: country
      })
      .select()
      .single();

    if (createError) {
      logs.push(`❌ Failed to create POI: ${createError.message}`);
      return NextResponse.json({ success: false, error: createError.message, logs }, { status: 500 });
    }

    logs.push(`✅ POI created with database ID: ${newPoi.id}`);

    // Step 2: Generate mock translations for all 14 languages
    logs.push(`\n[STEP 2] Generating mock translations for 14 languages...`);

    const languages = [
      'ZH-CN', 'ZH-TW', 'JA-JP', 'KO-KR', 'TH-TH', 'VI-VN',
      'ID-ID', 'MS-MY', 'EN-US', 'EN-GB', 'FR-FR', 'DE-DE', 'IT-IT', 'PT-BR'
    ];

    const mockTranslations: any[] = [];

    for (const lang of languages) {
      const translation = {
        languageCode: lang,
        text: `${name} (${lang})`,
        status: Math.random() > 0.7 ? 'manual_review' : 'completed', // 30% chance of manual review
        sources: {
          serp: `${name} SERP (${lang})`,
          googleMaps: `${name} Google Maps (${lang})`,
          perplexity: `${name} Perplexity (${lang})`,
          openai: `${name} OpenAI (${lang})`
        },
        similarityScore: Math.random() * 0.3 + 0.7, // 0.7 - 1.0
        needsManualCheck: Math.random() > 0.7
      };

      mockTranslations.push(translation);
      logs.push(`  📝 ${lang}: ${translation.text} (${translation.status})`);
    }

    logs.push(`✅ Generated ${mockTranslations.length} translations`);

    // Step 3: Call batch save API
    logs.push(`\n[STEP 3] Calling batch save API...`);
    logs.push(`POST /api/translations/batch`);
    logs.push(`Request body: { klookId: "${klookId}", translations: [${mockTranslations.length} items] }`);

    const batchSaveResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/translations/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        klookId: klookId,
        translations: mockTranslations
      })
    });

    logs.push(`Response status: ${batchSaveResponse.status} ${batchSaveResponse.statusText}`);

    if (batchSaveResponse.ok) {
      const batchResult = await batchSaveResponse.json();
      logs.push(`✅ Batch save successful!`);
      logs.push(`   - Saved: ${batchResult.savedCount} translations`);
      logs.push(`   - Errors: ${batchResult.errorCount} translations`);

      if (batchResult.errors && batchResult.errors.length > 0) {
        logs.push(`   - Error details:`);
        batchResult.errors.forEach((err: any) => {
          logs.push(`     • ${err.language}: ${err.error}`);
        });
      }
    } else {
      const errorData = await batchSaveResponse.json();
      logs.push(`❌ Batch save failed: ${errorData.error}`);
      return NextResponse.json({
        success: false,
        error: 'Batch save failed',
        details: errorData,
        logs
      }, { status: 500 });
    }

    // Step 4: Verify data in database
    logs.push(`\n[STEP 4] Verifying data in database...`);

    const { data: savedTranslations, error: fetchError } = await supabase
      .from('translations')
      .select('id, language_code, final_translation, status')
      .eq('poi_id', newPoi.id);

    if (fetchError) {
      logs.push(`❌ Failed to fetch translations: ${fetchError.message}`);
    } else {
      logs.push(`✅ Found ${savedTranslations?.length || 0} translations in database`);

      if (savedTranslations) {
        const completedCount = savedTranslations.filter(t => t.status === 'completed').length;
        const manualReviewCount = savedTranslations.filter(t => t.status === 'manual_review').length;

        logs.push(`   - Completed: ${completedCount}`);
        logs.push(`   - Manual Review: ${manualReviewCount}`);
        logs.push(`   - Total: ${savedTranslations.length}`);

        logs.push(`\n   Translations:`);
        savedTranslations.forEach(t => {
          logs.push(`   • ${t.language_code}: ${t.final_translation} (${t.status})`);
        });
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    logs.push(`\n[COMPLETE] Test completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      poi: newPoi,
      translationsGenerated: mockTranslations.length,
      translationsSaved: savedTranslations?.length || 0,
      duration: `${duration}ms`,
      logs
    }, { status: 200 });

  } catch (error) {
    console.error('Test translation error:', error);
    logs.push(`\n❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs
    }, { status: 500 });
  }
}
