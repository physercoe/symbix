-- Migration: Add teams, team_members, activity_events tables
-- Also migrate agents and machines from workspace-scoped to team-scoped
-- Run this BEFORE starting the server with updated schema

BEGIN;

-- 1. Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES users(id),
  description TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 3. Create activity_events table
CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_type VARCHAR(10) NOT NULL,
  actor_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_events_team_type_idx ON activity_events(team_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS activity_events_actor_idx ON activity_events(actor_id, created_at);

-- 4. For each distinct user who owns workspaces OR agents OR machines, create a team
INSERT INTO teams (id, name, slug, owner_id, created_at)
SELECT
  gen_random_uuid(),
  u.name || '''s Team',
  LOWER(REGEXP_REPLACE(u.name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || EXTRACT(EPOCH FROM NOW())::bigint || '-' || floor(random()*1000)::int,
  u.id,
  NOW()
FROM users u
WHERE u.id IN (SELECT DISTINCT owner_id FROM workspaces)
ON CONFLICT DO NOTHING;

-- Also create teams for users who don't own workspaces but exist (catch-all)
-- This ensures every user has a team for the NOT NULL constraint
INSERT INTO teams (id, name, slug, owner_id, created_at)
SELECT
  gen_random_uuid(),
  u.name || '''s Team',
  'user-' || REPLACE(u.id::text, '-', '') || '-' || EXTRACT(EPOCH FROM NOW())::bigint,
  u.id,
  NOW()
FROM users u
WHERE u.id NOT IN (SELECT owner_id FROM teams)
ON CONFLICT DO NOTHING;

-- Add all users as team owners of their own team
INSERT INTO team_members (team_id, user_id, role)
SELECT t.id, t.owner_id, 'owner'
FROM teams t
ON CONFLICT DO NOTHING;

-- 5. Add team_id to workspaces (nullable first, populate, then NOT NULL)
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

UPDATE workspaces w
SET team_id = t.id
FROM teams t
WHERE t.owner_id = w.owner_id
  AND w.team_id IS NULL;

-- Safety: if any workspace still has NULL team_id (shouldn't happen), assign to first team
UPDATE workspaces w
SET team_id = (SELECT id FROM teams LIMIT 1)
WHERE w.team_id IS NULL
  AND EXISTS (SELECT 1 FROM teams);

-- Now enforce NOT NULL
ALTER TABLE workspaces ALTER COLUMN team_id SET NOT NULL;

-- 6. Add team_id to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Populate from workspace's team (agents currently have workspace_id)
UPDATE agents a
SET team_id = ws.team_id
FROM workspaces ws
WHERE a.workspace_id = ws.id
  AND a.team_id IS NULL;

-- Safety: any agents without a workspace, assign to first team
UPDATE agents a
SET team_id = (SELECT id FROM teams LIMIT 1)
WHERE a.team_id IS NULL
  AND EXISTS (SELECT 1 FROM teams);

-- Create workspace_members entries for deployed agents (preserve workspace association)
INSERT INTO workspace_members (workspace_id, member_type, agent_id, role)
SELECT a.workspace_id, 'agent', a.id, 'member'
FROM agents a
WHERE a.workspace_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Now enforce NOT NULL and drop old column
ALTER TABLE agents ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE agents DROP COLUMN IF EXISTS workspace_id;

-- 7. Add team_id to machines
ALTER TABLE machines ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

UPDATE machines m
SET team_id = ws.team_id
FROM workspaces ws
WHERE m.workspace_id = ws.id
  AND m.team_id IS NULL;

-- Safety fallback
UPDATE machines m
SET team_id = (SELECT id FROM teams LIMIT 1)
WHERE m.team_id IS NULL
  AND EXISTS (SELECT 1 FROM teams);

-- Enforce NOT NULL and drop old column
ALTER TABLE machines ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE machines DROP COLUMN IF EXISTS workspace_id;

-- 8. Add config column to workspace_members
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- 9. Add team_id to specs (nullable, no NOT NULL needed)
ALTER TABLE specs ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- 10. Indexes
CREATE INDEX IF NOT EXISTS specs_user_type_idx ON specs(user_id, spec_type);
CREATE INDEX IF NOT EXISTS specs_visibility_idx ON specs(visibility);

COMMIT;
