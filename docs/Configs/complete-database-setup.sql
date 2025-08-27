-- 🚀 Complete Database Setup for RPA Platform
-- Run this in Supabase SQL Editor (Step by step)
-- 
-- This script sets up the complete database schema for the RPA Platform
-- with proper Clerk integration and organization support

-- ============================================================================
-- STEP 1: CREATE CORE TABLES
-- ============================================================================

-- Profiles table (Users)
CREATE TABLE IF NOT EXISTS profiles (
  id text primary key,                    -- Clerk user ID
  clerk_user_id text unique not null,     -- Clerk user ID (duplicate for easier queries)
  email text not null,
  first_name text,
  last_name text,
  image_url text,
  branding_config jsonb default '{"primaryColor": "#007bff", "secondaryColor": "#6c757d", "companyName": "RPA Platform"}',
  active_organization_id uuid,             -- Current active org
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text unique not null,
  name text not null,
  slug text unique not null,
  description text,
  logo_url text,
  branding_config jsonb default '{}',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Organization memberships
CREATE TABLE IF NOT EXISTS organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id text references profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'member', 'viewer')) default 'member',
  created_at timestamp default now(),
  unique(organization_id, user_id)
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  steps jsonb not null default '[]',         -- Workflow steps/nodes
  variables jsonb default '{}',              -- Workflow variables
  status text check (status in ('draft', 'active', 'paused', 'archived')) default 'draft',
  user_id text references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  version integer default 1
);

-- Workflow executions
CREATE TABLE IF NOT EXISTS workflow_executions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id) on delete cascade,
  status text check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')) default 'pending',
  started_at timestamp,
  completed_at timestamp,
  execution_log jsonb default '[]',          -- Execution logs
  variables jsonb default '{}',              -- Runtime variables
  error_message text,
  user_id text references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  created_at timestamp default now()
);

-- ============================================================================
-- STEP 2: ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key for active_organization_id in profiles
ALTER TABLE profiles 
ADD CONSTRAINT profiles_active_organization_fkey 
FOREIGN KEY (active_organization_id) REFERENCES organizations(id);

-- ============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_organization_id ON workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at);

CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_organization_id ON workflow_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON workflow_executions(created_at);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id ON organization_memberships(organization_id);

-- ============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: CREATE RLS POLICIES
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles 
FOR ALL USING (
  id = current_setting('request.jwt.claims', true)::json->>'sub'
);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles 
FOR UPDATE USING (
  id = current_setting('request.jwt.claims', true)::json->>'sub'
);

-- Organizations policies
DROP POLICY IF EXISTS "Users can view orgs they belong to" ON organizations;
CREATE POLICY "Users can view orgs they belong to" ON organizations 
FOR SELECT USING (
  id IN (
    SELECT organization_id 
    FROM organization_memberships 
    WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Organization memberships policies  
DROP POLICY IF EXISTS "Users can view their memberships" ON organization_memberships;
CREATE POLICY "Users can view their memberships" ON organization_memberships 
FOR SELECT USING (
  user_id = current_setting('request.jwt.claims', true)::json->>'sub'
);

-- Workflows policies
DROP POLICY IF EXISTS "Users can view org workflows" ON workflows;
CREATE POLICY "Users can view org workflows" ON workflows 
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_memberships 
    WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  ) 
  OR user_id = current_setting('request.jwt.claims', true)::json->>'sub'
);

DROP POLICY IF EXISTS "Users can manage own workflows" ON workflows;
CREATE POLICY "Users can manage own workflows" ON workflows 
FOR ALL USING (
  user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  OR organization_id IN (
    SELECT organization_id 
    FROM organization_memberships 
    WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    AND role IN ('admin', 'member')
  )
);

-- Workflow executions policies
DROP POLICY IF EXISTS "Users can view org executions" ON workflow_executions;
CREATE POLICY "Users can view org executions" ON workflow_executions 
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_memberships 
    WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
  OR user_id = current_setting('request.jwt.claims', true)::json->>'sub'
);

DROP POLICY IF EXISTS "Users can manage own executions" ON workflow_executions;
CREATE POLICY "Users can manage own executions" ON workflow_executions 
FOR ALL USING (
  user_id = current_setting('request.jwt.claims', true)::json->>'sub'
);

-- ============================================================================
-- STEP 6: CREATE HELPFUL FUNCTIONS
-- ============================================================================

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_clerk_id text)
RETURNS TABLE(
  id uuid,
  clerk_org_id text,
  name text,
  slug text,
  role text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.clerk_org_id,
    o.name,
    o.slug,
    om.role
  FROM organizations o
  JOIN organization_memberships om ON o.id = om.organization_id
  WHERE om.user_id = user_clerk_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new workflow
CREATE OR REPLACE FUNCTION create_workflow(
  workflow_name text,
  workflow_description text DEFAULT '',
  workflow_steps jsonb DEFAULT '[]',
  user_clerk_id text,
  org_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  new_workflow_id uuid;
BEGIN
  INSERT INTO workflows (name, description, steps, user_id, organization_id)
  VALUES (workflow_name, workflow_description, workflow_steps, user_clerk_id, org_id)
  RETURNING id INTO new_workflow_id;
  
  RETURN new_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: INSERT DEFAULT DATA (OPTIONAL)
-- ============================================================================

-- You can uncomment and modify this section with your actual Clerk user ID
/*
-- Example: Insert a test user profile
INSERT INTO profiles (id, clerk_user_id, email, first_name, last_name) 
VALUES (
  'your_clerk_user_id_here',
  'your_clerk_user_id_here', 
  'your-email@example.com',
  'Your',
  'Name'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = now();

-- Example: Create a default organization
INSERT INTO organizations (clerk_org_id, name, slug, description)
VALUES (
  'org_default',
  'Default Organization', 
  'default-org',
  'Default organization for individual users'
) ON CONFLICT (clerk_org_id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = now();
*/

-- ============================================================================
-- STEP 8: VERIFY SETUP
-- ============================================================================

-- Check that all tables exist
SELECT 
  schemaname,
  tablename,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename IN ('profiles', 'organizations', 'organization_memberships', 'workflows', 'workflow_executions')
ORDER BY tablename;

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'organizations', 'organization_memberships', 'workflows', 'workflow_executions')
ORDER BY tablename;

-- Show all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'organizations', 'organization_memberships', 'workflows', 'workflow_executions')
ORDER BY tablename, policyname;