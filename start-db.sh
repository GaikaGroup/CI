#!/bin/bash

# Start Database Script for AI Tutor Platform
# This script starts the Prisma Postgres database

echo "🗄️  Starting Prisma Postgres Database..."
echo "=========================================="

# Check if Prisma CLI is installed
if ! command -v prisma &> /dev/null; then
    echo "❌ Prisma CLI not found. Installing..."
    npm install -g prisma
fi

# Start Prisma Postgres
echo "📦 Starting Prisma Postgres..."
npx prisma dev

echo ""
echo "✅ Database started successfully!"
echo ""
echo "Database is running on:"
echo "  - Port: 51214"
echo "  - Connection: Check DATABASE_URL in .env"
echo ""
echo "To stop the database, press Ctrl+C"
