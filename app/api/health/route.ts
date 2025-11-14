import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const response: any = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
    },
    checks: {
      supabase: {
        status: 'unknown',
        hasUrl: false,
        hasAnonKey: false,
        urlPattern: null,
      }
    }
  };

  try {
    // Check if environment variables exist
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    response.checks.supabase.hasUrl = !!supabaseUrl;
    response.checks.supabase.hasAnonKey = !!supabaseAnonKey;

    if (supabaseUrl) {
      // Show pattern of URL for debugging (hide sensitive parts)
      const urlPattern = supabaseUrl.replace(/https:\/\/([^.]+)\.supabase\.co.*/, 'https://$1.supabase.co');
      response.checks.supabase.urlPattern = urlPattern;
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      response.status = 'error';
      response.checks.supabase.status = 'missing_config';
      response.error = 'Supabase environment variables are not configured';

      return NextResponse.json(response, { status: 503 });
    }

    // Try to create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Test connection with a simple query
    const { error } = await supabase.auth.getSession();

    if (error) {
      response.status = 'error';
      response.checks.supabase.status = 'connection_failed';
      response.checks.supabase.error = error.message;
    } else {
      response.status = 'healthy';
      response.checks.supabase.status = 'connected';
    }

    return NextResponse.json(response, {
      status: response.status === 'healthy' ? 200 : 503
    });

  } catch (error: any) {
    response.status = 'error';
    response.error = error.message || 'Unknown error occurred';
    response.checks.supabase.status = 'error';

    return NextResponse.json(response, { status: 503 });
  }
}