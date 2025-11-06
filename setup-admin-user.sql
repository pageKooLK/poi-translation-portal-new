-- Setup Admin User for POI Translation Portal
-- This script creates the initial admin user in Supabase Auth
--
-- IMPORTANT: Run this script in the Supabase SQL Editor after setting up your project
--
-- Admin Credentials:
-- Email: tna_planning_tw@klook.com
-- Password: Taipeitna2025!Klook

-- Note: Supabase doesn't allow direct insertion into auth.users via SQL for security reasons.
-- Instead, you need to:

-- Option 1: Use Supabase Dashboard
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to Authentication > Users
-- 3. Click "Invite user" or "Create user"
-- 4. Enter email: tna_planning_tw@klook.com
-- 5. Set password: Taipeitna2025!Klook

-- Option 2: Use the Supabase Auth API endpoint
-- POST to: https://[YOUR-PROJECT-REF].supabase.co/auth/v1/signup
-- Headers:
--   apikey: [YOUR-ANON-KEY]
--   Content-Type: application/json
-- Body:
-- {
--   "email": "tna_planning_tw@klook.com",
--   "password": "Taipeitna2025!Klook"
-- }

-- Option 3: Use the application's sign-up flow (if implemented)
-- Navigate to /signup (if available) and create the admin account

-- After creating the admin user, you may want to add additional user metadata:
-- This can be done through the Supabase dashboard or via the auth.users table

-- Example of adding user metadata (run after user is created):
/*
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'),
  '{role}',
  '"admin"'
)
WHERE email = 'tna_planning_tw@klook.com';
*/

-- Create a profiles table to store additional user information (optional)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    CASE
      WHEN new.email = 'tna_planning_tw@klook.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;