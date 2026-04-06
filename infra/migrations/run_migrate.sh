#!/usr/bin/env bash
# Run the 001_add_teams migration via Docker
# Usage: bash infra/migrations/run_migrate.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER=$(docker ps -q --filter "ancestor=pgvector/pgvector:pg16" --filter "status=running")

if [ -z "$CONTAINER" ]; then
  echo "ERROR: No running pgvector/postgres container found."
  echo "Make sure 'docker compose up -d' has been run in infra/"
  exit 1
fi

echo "==> Running 001_add_teams migration on container $CONTAINER ..."
docker cp "$SCRIPT_DIR/001_add_teams.sql" "$CONTAINER:/tmp/001_add_teams.sql"
docker exec "$CONTAINER" psql -U postgres -d symbix -f /tmp/001_add_teams.sql

echo ""
echo "==> Migration complete. Verifying new tables:"
docker exec "$CONTAINER" psql -U postgres -d symbix -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('teams','team_members','activity_events') ORDER BY table_name;"

echo ""
echo "==> Teams created:"
docker exec "$CONTAINER" psql -U postgres -d symbix -c "SELECT id, name, slug, owner_id FROM teams;"

echo ""
echo "==> Workspaces team_id populated:"
docker exec "$CONTAINER" psql -U postgres -d symbix -c "SELECT id, name, team_id FROM workspaces;"
