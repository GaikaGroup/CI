#!/bin/bash

# Script to cleanup database connections
# Run this if you get "too many clients already" error

echo "🔍 Checking PostgreSQL connections..."

# Get database name from .env
DB_NAME=$(grep DATABASE_URL .env | sed 's/.*\/\([^?]*\).*/\1/')

if [ -z "$DB_NAME" ]; then
  echo "❌ Could not find database name in .env"
  exit 1
fi

echo "📊 Database: $DB_NAME"

# Count active connections
CONNECTIONS=$(psql -U mak -d postgres -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME';")
echo "📈 Active connections: $CONNECTIONS"

# Kill idle connections older than 5 minutes
echo "🧹 Killing idle connections..."
psql -U mak -d postgres -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname = '$DB_NAME' 
    AND state = 'idle' 
    AND state_change < current_timestamp - INTERVAL '5 minutes';
"

# Kill all connections except current one (use with caution!)
if [ "$1" = "--force" ]; then
  echo "⚠️  Force killing all connections..."
  psql -U mak -d postgres -c "
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = '$DB_NAME' 
      AND pid <> pg_backend_pid();
  "
fi

# Show remaining connections
REMAINING=$(psql -U mak -d postgres -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME';")
echo "✅ Remaining connections: $REMAINING"

echo ""
echo "💡 Tips:"
echo "  - Run 'npm run dev' to start fresh"
echo "  - Use 'npm run db:cleanup --force' to kill all connections"
echo "  - Check connection pool settings in .env"
