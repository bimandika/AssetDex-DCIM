#!/bin/bash

# This script runs the consolidated migration SQL against the local Supabase Postgres instance
# Usage: ./scripts/run-migration.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Error logging function
error() {
    log "${RED}ERROR:${NC} $1"
    exit 1
}

# Configuration
PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-postgres}"
PGDATABASE="${POSTGRES_DB:-postgres}"
PGPASSWORD="${POSTGRES_PASSWORD}"
MIGRATION_FILE="/app/database/consolidated-migration.sql"
LOG_FILE="/tmp/migration-$(date +%Y%m%d%H%M%S).log"

# Start logging - send everything to both stdout/stderr and log file
exec > >(tee -a "$LOG_FILE") 2>&1

# Function to log to both console and file
log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$message"  # This goes to stdout/stderr (container logs)
    echo -e "$message" >> "$LOG_FILE"  # This goes to the log file
}

log "${GREEN}=== Starting Database Migration ===${NC}"
log "Host: ${YELLOW}$PGHOST${NC}"
log "Port: ${YELLOW}$PGPORT${NC}"
log "Database: ${YELLOW}$PGDATABASE${NC}"
log "User: ${YELLOW}$PGUSER${NC}"
log "Migration file: ${YELLOW}$MIGRATION_FILE${NC}"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    error "psql is not installed. Installing postgresql-client..."
    apk add --no-cache postgresql-client || error "Failed to install postgresql-client"
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    error "Migration file not found: $MIGRATION_FILE"
    log "Current directory: $(pwd)"
    log "Directory contents:"
    ls -la "$(dirname "$MIGRATION_FILE")" || true
    exit 1
fi

# Test database connection
log "Testing database connection..."
CONNECTION_STRING="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}"

if ! PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 'Connection successful' AS message;" &>/dev/null; then
    error "Could not connect to the database"
    log "Connection string: ${YELLOW}${CONNECTION_STRING//${PGPASSWORD}/*****}"
    log "Please verify:"
    log "1. Database is running and accessible from this container"
    log "2. Host, port, and database name are correct"
    log "3. Username and password are correct"
    log "4. Network connectivity between containers (if applicable)"
    exit 1
fi

log "${GREEN}✓ Database connection successful${NC}"

# Run the migration
log "Starting migration..."
log "Migration file size: ${YELLOW}$(du -h "$MIGRATION_FILE" | cut -f1)${NC}"
log "Running: ${YELLOW}psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f $MIGRATION_FILE${NC}"

set +e
export PGPASSWORD

# Execute migration with error handling
if ! psql -v ON_ERROR_STOP=1 -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f "$MIGRATION_FILE"; then
    error "Migration failed with exit code $?"
    exit 1
fi

unset PGPASSWORD

# Verify migration
log "${GREEN}✓ Migration completed. Verifying...${NC}"

TABLES=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "\dt" 2>&1)

if [ $? -eq 0 ]; then
    log "${GREEN}✓ Database verification successful${NC}"
    log "${YELLOW}Tables in database:${NC}"
    echo "$TABLES"
else
    log "${YELLOW}WARNING: Could not verify migration results. Check the logs above for errors.${NC}"
    log "Error: $TABLES"
fi

log "${GREEN}=== Migration Completed Successfully ===${NC}"
log "Log saved to: ${YELLOW}$LOG_FILE${NC}"

exit 0
