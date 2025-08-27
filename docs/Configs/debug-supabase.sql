-- Debug Supabase issues
-- Run these queries in Supabase SQL Editor to diagnose

-- 1. Check if RLS is blocking queries
SELECT * FROM workflows LIMIT 5;
SELECT * FROM profiles LIMIT 5;

-- 2. Check RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('workflows', 'profiles');

-- 3. Temporarily disable RLS for testing (ONLY for development)
ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 4. Test basic inserts
INSERT INTO profiles (id, clerk_user_id, email) 
VALUES ('user_31KSxf6CXhTSAcV0vQrp5Rvua53', 'user_31KSxf6CXhTSAcV0vQrp5Rvua53', 'test@example.com')
ON CONFLICT (id) DO NOTHING;

-- 5. Re-enable RLS after testing
-- ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;