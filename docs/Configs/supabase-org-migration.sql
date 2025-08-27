-- Add organizations table
CREATE TABLE organizations (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text unique not null,
  name text not null,
  slug text unique not null,
  branding_config jsonb default '{}',
  created_at timestamp default now()
);

-- Add organization memberships
CREATE TABLE organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member', -- admin, member, viewer
  created_at timestamp default now(),
  unique(organization_id, user_id)
);

-- Update workflows table to include organization
ALTER TABLE workflows ADD COLUMN organization_id uuid references organizations(id);
ALTER TABLE workflow_executions ADD COLUMN organization_id uuid references organizations(id);

-- Update profiles table
ALTER TABLE profiles ADD COLUMN active_organization_id uuid references organizations(id);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizations
CREATE POLICY "Users can view orgs they belong to" ON organizations FOR ALL USING (
  id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view their memberships" ON organization_memberships FOR ALL USING (
  user_id = auth.uid()
);

-- Update workflow policies for organization access
DROP POLICY IF EXISTS "Users can view own workflows" ON workflows;
CREATE POLICY "Users can view org workflows" ON workflows FOR ALL USING (
  organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid())
);

-- Update execution policies
DROP POLICY IF EXISTS "Users can view own executions" ON workflow_executions;
CREATE POLICY "Users can view org executions" ON workflow_executions FOR ALL USING (
  organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid())
);