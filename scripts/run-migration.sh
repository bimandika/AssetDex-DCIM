#!/bin/bash

# This script runs the consolidated migration SQL against the local Supabase Postgres instance.
# Usage: ./scripts/run-migration.sh

set -e

PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-postgres}"
PGDATABASE="${POSTGRES_DB:-postgres}"
PGPASSWORD="${POSTGRES_PASSWORD:-your-super-secret-and-long-postgres-password}"
MIGRATION_FILE="database/consolidated-migration.sql"

if ! command -v psql &> /dev/null; then
  echo "Error: psql is not installed in the container."
  exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

export PGPASSWORD

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f "$MIGRATION_FILE"

unset PGPASSWORD

echo "✓ Migration executed successfully."
