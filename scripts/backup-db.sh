#!/bin/bash

# Database Backup Script
# Automatically backs up PostgreSQL database

set -e

# Configuration
DB_NAME="ai_tutor_sessions"
BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"
MAX_BACKUPS=30  # Keep last 30 backups

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting database backup...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if ! psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${RED}Error: Database '$DB_NAME' not found${NC}"
    exit 1
fi

# Create backup
echo -e "Backing up database: ${GREEN}$DB_NAME${NC}"
pg_dump "$DB_NAME" > "$BACKUP_FILE"

# Compress backup
echo -e "Compressing backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo -e "${GREEN}✓ Backup created successfully${NC}"
echo -e "  File: $BACKUP_FILE"
echo -e "  Size: $BACKUP_SIZE"

# Clean up old backups
echo -e "\nCleaning up old backups (keeping last $MAX_BACKUPS)..."
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    OLD_BACKUPS=$(ls -1t "$BACKUP_DIR"/backup_*.sql.gz | tail -n +$((MAX_BACKUPS + 1)))
    echo "$OLD_BACKUPS" | while read -r file; do
        echo -e "  Removing: $file"
        rm "$file"
    done
    echo -e "${GREEN}✓ Cleanup completed${NC}"
else
    echo -e "  No cleanup needed (${BACKUP_COUNT}/${MAX_BACKUPS} backups)"
fi

echo -e "\n${GREEN}Backup process completed!${NC}"
