import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with your database
// Note: During build time, env vars might not be set. The client will be created
// but will fail at runtime if used without proper configuration.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Type definitions for database tables
export interface POI {
  id: string;
  klook_poi_id: string;
  klook_poi_name: string;
  google_place_id: string;
  country: string;
  google_maps_data?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Translation {
  id: string;
  poi_id: string;
  language_code: string;
  final_translation: string;
  status: 'processing' | 'completed' | 'manual_review';
  similarity_score?: number;
  needs_manual_check: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TranslationSource {
  id: string;
  translation_id: string;
  source_type: 'serp' | 'google_maps' | 'perplexity' | 'openai';
  recommended_name?: string;
  reasoning?: string;
  confidence_score?: number;
  raw_data?: any;
  html_snapshot_url?: string;
  created_at?: string;
}

export interface ManualCheckQueue {
  id: string;
  poi_id: string;
  language_code: string;
  check_type: string;
  priority: number;
  current_reviewer?: string;
  reviewer_start_time?: string;
  metadata?: any;
  created_at?: string;
}

export interface EditHistory {
  id: string;
  poi_id: string;
  language_code: string;
  action: string;
  old_value?: string;
  new_value?: string;
  reviewer_name: string;
  reviewer_email: string;
  reasoning?: string;
  created_at?: string;
}

export interface DuplicateCheck {
  id: string;
  new_poi_data: any;
  duplicate_candidates?: any;
  resolution?: string;
  reviewer_name?: string;
  created_at?: string;
}
