#!/usr/bin/env bash
# Rollback the 001_add_teams migration via Docker
# Usage: bash infra/migrations/run_rollback.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER=$(docker ps -q --filter "ancestor=pgvector/pgvector:pg16" --filter "status=running")

if [ -z "$CONTAINER" ]; then
  echo "ERROR: No running pgvector/postgres container found."
  echo "Make sure 'docker compose up -d' has been run in infra/"
  exit 1
fi

echo "==> Rolling back 001_add_teams on container $CONTAINER ..."
docker cp "$SCRIPT_DIR/001_rollback.sql" "$CONTAINER:/tmp/001_rollback.sql"
docker exec "$CONTAINER" psql -U postgres -d symbix -f /tmp/001_rollback.sql

echo "==> Rollback complete. Current tables:"
docker exec "$CONTAINER" psql -U postgres -d symbix -c "\dt"
