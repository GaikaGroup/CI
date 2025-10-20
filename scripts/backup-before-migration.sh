#!/bin/bash

# Pre-Migration Backup Script
# Creates a backup before running database migrations

set -e

# Configuration
DB_NAME="ai_tutor_sessions"
BACKUP_DIR="backups/pre-migration"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pre_migration_$DATE.sql"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Pre-Migration Backup ===${NC}\n"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
echo -e "Creating backup before migration..."
pg_dump "$DB_NAME" > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo -e "${GREEN}✓ Pre-migration backup created${NC}"
echo -e "  File: $BACKUP_FILE"
echo -e "  Size: $BACKUP_SIZE"
echo -e "\n${YELLOW}You can now safely run your migration.${NC}"
echo -e "To restore if needed: ./scripts/restore-db.sh $BACKUP_FILE\n"
