import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/translations/batch - Save multiple translations for a POI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { poiId, klookId, translations } = body;

    // Validate required fields
    if (!klookId || !translations || !Array.isArray(translations)) {
      return NextResponse.json(
        { error: 'Missing required fields: klookId and translations array' },
        { status: 400 }
      );
    }

    console.log(`Saving ${translations.length} translations for POI ${klookId}`);

    // Get POI ID from database using klookId
    const { data: poi, error: poiError } = await supabase
      .from('pois')
      .select('id')
      .eq('klook_poi_id', klookId)
      .single();

    if (poiError || !poi) {
      console.error('POI not found:', poiError);
      return NextResponse.json(
        { error: `POI with Klook ID ${klookId} not found. Please create the POI first.` },
        { status: 404 }
      );
    }

    const dbPoiId = poi.id;
    const savedTranslations = [];
    const errors = [];

    // Process each translation
    for (const translation of translations) {
      const { languageCode, text, status, sources, similarityScore, needsManualCheck } = translation;

      if (!languageCode || !text) {
        errors.push({ languageCode, error: 'Missing languageCode or text' });
        continue;
      }

      try {
        // Upsert translation (insert or update if exists)
        const { data: savedTranslation, error: translationError } = await supabase
          .from('translations')
          .upsert({
            poi_id: dbPoiId,
            language_code: languageCode,
            final_translation: text,
            status: status || 'completed',
            similarity_score: similarityScore || null,
            needs_manual_check: needsManualCheck || false,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'poi_id,language_code'
          })
          .select()
          .single();

        if (translationError) {
          console.error(`Error saving translation for ${languageCode}:`, translationError);
          errors.push({ languageCode, error: translationError.message });
          continue;
        }

        // Save translation sources if provided
        if (sources && savedTranslation) {
          const translationId = savedTranslation.id;

          // Delete existing sources for this translation
          await supabase
            .from('translation_sources')
            .delete()
            .eq('translation_id', translationId);

          // Insert new sources
          const sourcesToInsert = [];

          if (sources.serp) {
            sourcesToInsert.push({
              translation_id: translationId,
              source_type: 'serp',
              recommended_name: sources.serp.translation || sources.serp.text,
              reasoning: sources.serp.reasoning,
              confidence_score: sources.serp.confidence,
              raw_data: sources.serp.rawData || null
            });
          }

          if (sources.googleMaps) {
            sourcesToInsert.push({
              translation_id: translationId,
              source_type: 'google_maps',
              recommended_name: sources.googleMaps.translation || sources.googleMaps.text,
              reasoning: sources.googleMaps.reasoning,
              confidence_score: sources.googleMaps.confidence,
              raw_data: sources.googleMaps.rawData || null
            });
          }

          if (sources.perplexity) {
            sourcesToInsert.push({
              translation_id: translationId,
              source_type: 'perplexity',
              recommended_name: sources.perplexity.translation || sources.perplexity.text,
              reasoning: sources.perplexity.reasoning,
              confidence_score: sources.perplexity.confidence,
              raw_data: sources.perplexity.rawData || null
            });
          }

          if (sources.openai) {
            sourcesToInsert.push({
              translation_id: translationId,
              source_type: 'openai',
              recommended_name: sources.openai.translation || sources.openai.text,
              reasoning: sources.openai.reasoning,
              confidence_score: sources.openai.confidence,
              raw_data: sources.openai.rawData || null
            });
          }

          if (sourcesToInsert.length > 0) {
            const { error: sourcesError } = await supabase
              .from('translation_sources')
              .insert(sourcesToInsert);

            if (sourcesError) {
              console.error(`Error saving sources for ${languageCode}:`, sourcesError);
            }
          }
        }

        savedTranslations.push({
          languageCode,
          translationId: savedTranslation.id,
          status: 'success'
        });

      } catch (error) {
        console.error(`Error processing translation for ${languageCode}:`, error);
        errors.push({
          languageCode,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Add to manual check queue if needed
    for (const translation of translations) {
      if (translation.needsManualCheck) {
        try {
          await supabase
            .from('manual_check_queue')
            .insert({
              poi_id: dbPoiId,
              language_code: translation.languageCode,
              check_type: 'translation_inconsistency',
              priority: 0,
              metadata: {
                similarity_score: translation.similarityScore,
                sources: translation.sources
              }
            });
        } catch (error) {
          console.error(`Error adding ${translation.languageCode} to manual check queue:`, error);
        }
      }
    }

    console.log(`Saved ${savedTranslations.length} translations, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      savedCount: savedTranslations.length,
      errorCount: errors.length,
      savedTranslations,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Batch save translations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
