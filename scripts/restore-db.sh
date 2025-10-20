#!/bin/bash

# Database Restore Script
# Restores PostgreSQL database from backup

set -e

# Configuration
DB_NAME="ai_tutor_sessions"
BACKUP_DIR="backups"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Available backups:${NC}"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "No backups found"
    echo ""
    echo -e "${RED}Usage: $0 <backup_file>${NC}"
    echo -e "Example: $0 backups/backup_20241019_223000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}WARNING: This will replace all data in database '$DB_NAME'${NC}"
echo -e "${RED}All current data will be LOST!${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

echo -e "\n${YELLOW}Starting database restore...${NC}"

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "Decompressing backup..."
    TEMP_FILE="${BACKUP_FILE%.gz}"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
    CLEANUP_TEMP=true
else
    RESTORE_FILE="$BACKUP_FILE"
    CLEANUP_TEMP=false
fi

# Drop existing database and recreate
echo -e "Dropping existing database..."
dropdb --if-exists "$DB_NAME"

echo -e "Creating new database..."
createdb "$DB_NAME"

# Restore backup
echo -e "Restoring backup..."
psql "$DB_NAME" < "$RESTORE_FILE"

# Cleanup temp file
if [ "$CLEANUP_TEMP" = true ]; then
    rm "$RESTORE_FILE"
fi

echo -e "\n${GREEN}✓ Database restored successfully!${NC}"
echo -e "  Database: $DB_NAME"
echo -e "  From: $BACKUP_FILE"
