import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Mock database - in a real app, this would be replaced with actual database operations
let mockTranslations: Record<string, Record<string, any>> = {
  '50062020': {
    'ZH-CN': '马德里动物园水族馆',
    'ZH-TW': '馬德里動物園水族館',
    'JA-JP': 'マドリッド動物園水族館',
    'KO-KR': '마드리드 동물원 수족관',
    'TH-TH': 'สวนสัตว์อควาเรียมมาดริด',
    'VI-VN': 'Sở thú Thủy cung Madrid',
    'ID-ID': 'Kebun Binatang Akuarium Madrid',
    'MS-MY': 'Zoo Akuarium Madrid',
    'EN-US': 'Madrid Zoo Aquarium',
    'EN-GB': 'Madrid Zoo Aquarium',
    'FR-FR': 'Zoo Aquarium de Madrid',
    'DE-DE': 'Zoo Aquarium Madrid',
    'IT-IT': 'Zoo Acquario di Madrid',
    'PT-BR': 'Zoológico Aquário de Madrid'
  },
  '50062021': {
    'ZH-CN': { text: '普拉多博物馆', status: 'completed' },
    'ZH-TW': { text: '普拉多博物館', status: 'completed' },
    'JA-JP': { text: 'プラド美術館', status: 'completed' },
    'KO-KR': { text: '프라도 미술관', status: 'completed' },
    'TH-TH': { text: null, status: 'processing', progress: 65 },
    'VI-VN': { text: 'Bảo tàng Prado', status: 'manual_review' },
    'ID-ID': { text: 'Museum Prado', status: 'completed' },
    'MS-MY': { text: 'Muzium Prado', status: 'completed' },
    'EN-US': { text: 'Prado Museum', status: 'completed' },
    'EN-GB': { text: 'Prado Museum', status: 'completed' },
    'FR-FR': { text: 'Musée du Prado', status: 'manual_review' },
    'DE-DE': { text: 'Prado Museum', status: 'completed' },
    'IT-IT': { text: 'Museo del Prado', status: 'completed' },
    'PT-BR': { text: 'Museu do Prado', status: 'completed' }
  },
  '50062022': {
    'ZH-CN': { text: '马德里王宫', status: 'completed' },
    'ZH-TW': { text: '馬德里王宮', status: 'completed' },
    'JA-JP': { text: 'マドリード王宮', status: 'completed' },
    'KO-KR': { text: '마드리드 왕궁', status: 'completed' },
    'TH-TH': { text: 'พระราชวังมาดริด', status: 'completed' },
    'VI-VN': { text: null, status: 'processing', progress: 85 },
    'ID-ID': { text: 'Istana Kerajaan Madrid', status: 'completed' },
    'MS-MY': { text: 'Istana Diraja Madrid', status: 'completed' },
    'EN-US': { text: 'Royal Palace of Madrid', status: 'completed' },
    'EN-GB': { text: 'Royal Palace of Madrid', status: 'completed' },
    'FR-FR': { text: 'Palais royal de Madrid', status: 'completed' },
    'DE-DE': { text: 'Königspalast von Madrid', status: 'completed' },
    'IT-IT': { text: 'Palazzo Reale di Madrid', status: 'completed' },
    'PT-BR': { text: 'Palácio Real de Madrid', status: 'completed' }
  }
};

// Supported languages
const SUPPORTED_LANGUAGES = [
  'ZH-CN', 'ZH-TW', 'JA-JP', 'KO-KR', 'TH-TH', 'VI-VN',
  'ID-ID', 'MS-MY', 'EN-US', 'EN-GB', 'FR-FR', 'DE-DE', 'IT-IT', 'PT-BR'
];

export async function GET(
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

    const translations = mockTranslations[klookId];
    
    if (!translations) {
      return NextResponse.json(
        { error: `POI with Klook ID ${klookId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      klookId,
      translations,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get translations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { klookId: string } }
) {
  try {
    const klookId = params.klookId;
    const { language, text, reviewerName, reviewerEmail, reasoning } = await request.json();

    if (!klookId) {
      return NextResponse.json(
        { error: 'Klook ID is required' },
        { status: 400 }
      );
    }

    if (!language || text === undefined) {
      return NextResponse.json(
        { error: 'Language and text are required' },
        { status: 400 }
      );
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 }
      );
    }

    // Get POI from database
    const { data: poi, error: poiError } = await supabase
      .from('pois')
      .select('id')
      .eq('klook_poi_id', klookId)
      .single();

    if (poiError || !poi) {
      return NextResponse.json(
        { error: `POI with Klook ID ${klookId} not found` },
        { status: 404 }
      );
    }

    const poiId = poi.id;

    // Get existing translation
    const { data: existingTranslation, error: fetchError } = await supabase
      .from('translations')
      .select('*')
      .eq('poi_id', poiId)
      .eq('language_code', language)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching translation:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch existing translation', details: fetchError.message },
        { status: 500 }
      );
    }

    const oldValue = existingTranslation?.final_translation;

    // Update the translation
    const { data: updatedTranslation, error: updateError } = await supabase
      .from('translations')
      .upsert({
        poi_id: poiId,
        language_code: language,
        final_translation: text,
        status: 'completed',
        needs_manual_check: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'poi_id,language_code'
      })
      .select()
      .single();

    if (updateError) {
      console.error('Error updating translation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update translation', details: updateError.message },
        { status: 500 }
      );
    }

    // Log the edit in edit_history if reviewer info provided
    if (reviewerName && reviewerEmail) {
      await supabase
        .from('edit_history')
        .insert({
          poi_id: poiId,
          language_code: language,
          action: 'manual_edit',
          old_value: oldValue,
          new_value: text,
          reviewer_name: reviewerName,
          reviewer_email: reviewerEmail,
          reasoning: reasoning || null
        });
    }

    // Remove from manual check queue if exists
    await supabase
      .from('manual_check_queue')
      .delete()
      .eq('poi_id', poiId)
      .eq('language_code', language);

    console.log(`Translation updated: ${klookId} - ${language} = "${text}"`);

    return NextResponse.json({
      success: true,
      klookId,
      language,
      translation: updatedTranslation,
      message: `Translation for ${language} updated successfully`
    });
  } catch (error) {
    console.error('Update translation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
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
    const url = new URL(request.url);
    const language = url.searchParams.get('language');
    
    if (!klookId) {
      return NextResponse.json(
        { error: 'Klook ID is required' },
        { status: 400 }
      );
    }

    if (!mockTranslations[klookId]) {
      return NextResponse.json(
        { error: `POI with Klook ID ${klookId} not found` },
        { status: 404 }
      );
    }

    if (language) {
      // Delete specific language translation
      if (!SUPPORTED_LANGUAGES.includes(language)) {
        return NextResponse.json(
          { error: `Unsupported language: ${language}` },
          { status: 400 }
        );
      }

      if (!mockTranslations[klookId][language]) {
        return NextResponse.json(
          { error: `Translation for ${language} not found` },
          { status: 404 }
        );
      }

      delete mockTranslations[klookId][language];
      console.log(`Translation deleted: ${klookId} - ${language}`);

      return NextResponse.json({
        success: true,
        message: `Translation for ${language} deleted successfully`
      });
    } else {
      // Delete all translations for this POI
      delete mockTranslations[klookId];
      console.log(`All translations deleted for POI: ${klookId}`);

      return NextResponse.json({
        success: true,
        message: `All translations for POI ${klookId} deleted successfully`
      });
    }
  } catch (error) {
    console.error('Delete translation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}