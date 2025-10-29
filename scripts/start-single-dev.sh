#!/bin/bash

# Script to ensure only ONE dev server is running
# This prevents multiple dev servers from exhausting database connections

echo "🔍 Checking for existing dev servers..."

# Kill all existing vite dev processes
pkill -f "node.*vite dev" 2>/dev/null

# Kill processes on ports 3000-3015
for port in {3000..3015}; do
  lsof -ti:$port | xargs kill -9 2>/dev/null
done

echo "✅ Cleaned up existing dev servers"

# Cleanup database connections
echo "🧹 Cleaning up database connections..."
npm run db:cleanup --force --silent 2>/dev/null

echo "🚀 Starting dev server on port 3005..."
PORT=3005 npm run dev
