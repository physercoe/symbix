-- Rollback: undo 001_add_teams migration
-- Run this to clean up a partial or failed migration before re-running

BEGIN;

-- Drop new tables (CASCADE removes FK references)
DROP TABLE IF EXISTS activity_events CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- Remove added columns
ALTER TABLE workspaces DROP COLUMN IF EXISTS team_id;
ALTER TABLE agents DROP COLUMN IF EXISTS team_id;
ALTER TABLE machines DROP COLUMN IF EXISTS team_id;
ALTER TABLE specs DROP COLUMN IF EXISTS team_id;
ALTER TABLE workspace_members DROP COLUMN IF EXISTS config;

-- Restore workspace_id on agents if it was dropped
-- (adds it back as nullable — the server code handles both)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE agents ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Restore workspace_id on machines if it was dropped
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'machines' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE machines ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop indexes that were added
DROP INDEX IF EXISTS activity_events_team_type_idx;
DROP INDEX IF EXISTS activity_events_actor_idx;
DROP INDEX IF EXISTS specs_user_type_idx;
DROP INDEX IF EXISTS specs_visibility_idx;

COMMIT;
