#!/usr/bin/env node

/**
 * Script to set up the admin user in Supabase
 * Run this after setting up your Supabase project
 *
 * Usage: node scripts/setup-admin.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Admin credentials
const ADMIN_EMAIL = 'tna_planning_tw@klook.com';
const ADMIN_PASSWORD = 'Taipeitna2025!Klook';

// Initialize Supabase client with service role key for admin operations
// Note: You'll need to add SUPABASE_SERVICE_ROLE_KEY to your .env.local file
// You can find this in your Supabase dashboard under Settings > API
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  console.error('\nPlease add these to your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupAdmin() {
  console.log('🔧 Setting up admin user...\n');
  console.log(`📧 Email: ${ADMIN_EMAIL}`);
  console.log(`🔑 Password: ${ADMIN_PASSWORD}\n`);

  try {
    // First, try to sign in to check if user already exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (signInData?.user) {
      console.log('✅ Admin user already exists and credentials are correct!');
      console.log(`   User ID: ${signInData.user.id}`);
      return;
    }

    // If sign in fails, try to create the user
    console.log('Creating new admin user...');

    const { data, error } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      options: {
        data: {
          role: 'admin',
          full_name: 'TNA Planning Admin'
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('⚠️  User already exists but password might be different');
        console.log('   Please update the password manually in Supabase Dashboard');
        console.log('   Go to: Authentication > Users > Select user > Reset password');
      } else {
        throw error;
      }
    } else if (data?.user) {
      console.log('✅ Admin user created successfully!');
      console.log(`   User ID: ${data.user.id}`);

      if (data.user.confirmed_at) {
        console.log('   ✅ Email confirmed automatically');
      } else {
        console.log('   ⚠️  Email confirmation may be required');
        console.log('   Check your Supabase authentication settings');
      }
    }

  } catch (error) {
    console.error('❌ Error setting up admin user:', error.message);
    console.error('\nPossible solutions:');
    console.error('1. Check your Supabase URL and API keys');
    console.error('2. Ensure your Supabase project is properly configured');
    console.error('3. Try creating the user manually in the Supabase Dashboard');
    process.exit(1);
  }
}

// Run the setup
setupAdmin().then(() => {
  console.log('\n✨ Setup complete!');
  console.log('You can now log in with the admin credentials at /login');
  process.exit(0);
}).catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});