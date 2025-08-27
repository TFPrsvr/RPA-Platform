-- Fix database schema to work with Clerk user IDs
-- Run this in Supabase SQL Editor

-- 1. First, disable RLS temporarily for testing
ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships DISABLE ROW LEVEL SECURITY;

-- 2. Drop the foreign key constraint from profiles to auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Change profiles.id from uuid to text to support Clerk user IDs
ALTER TABLE profiles ALTER COLUMN id TYPE text;

-- 4. Update workflows.user_id to text as well
ALTER TABLE workflows ALTER COLUMN user_id TYPE text;

-- 5. Update organization_memberships.user_id to text
ALTER TABLE organization_memberships ALTER COLUMN user_id TYPE text;

-- 6. Create a test profile with your Clerk user ID
INSERT INTO profiles (id, clerk_user_id, email, branding_config) 
VALUES (
  'user_31KSxf6CXhTSAcV0vQrp5Rvua53', 
  'user_31KSxf6CXhTSAcV0vQrp5Rvua53', 
  'test@example.com',
  '{"primaryColor": "#007bff", "secondaryColor": "#6c757d", "companyName": "AutoFlow RPA"}'::jsonb
)
ON CONFLICT (clerk_user_id) DO NOTHING;

-- 7. Update RLS policies to work with text IDs
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR ALL USING (
  id = current_setting('request.jwt.claims', true)::json->>'sub'
);

DROP POLICY IF EXISTS "Users can view org workflows" ON workflows;
CREATE POLICY "Users can view own workflows" ON workflows FOR ALL USING (
  user_id = current_setting('request.jwt.claims', true)::json->>'sub'
);

-- 8. Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;