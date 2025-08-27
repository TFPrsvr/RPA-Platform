-- Simple fix - run these commands ONE BY ONE in Supabase SQL Editor

-- Step 1: Disable RLS temporarily
ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop the foreign key constraint that's causing the UUID requirement
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;

-- Step 3: Change the column type from uuid to text
ALTER TABLE profiles ALTER COLUMN id TYPE text;

-- Step 4: Now you can insert the Clerk user ID
INSERT INTO profiles (id, clerk_user_id, email) 
VALUES ('user_31KSxf6CXhTSAcV0vQrp5Rvua53', 'user_31KSxf6CXhTSAcV0vQrp5Rvua53', 'test@example.com');

-- Step 5: Fix other tables to use text for user_id
ALTER TABLE workflows ALTER COLUMN user_id TYPE text;
ALTER TABLE organization_memberships ALTER COLUMN user_id TYPE text;