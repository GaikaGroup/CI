#!/bin/bash

# Start Database Script for AI Tutor Platform
# This script sets up and starts the PostgreSQL database

echo "🗄️  Starting PostgreSQL Database..."
echo "=========================================="

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Please install PostgreSQL first:"
    echo "   brew install postgresql"
    echo "   or visit: https://www.postgresql.org/download/"
    exit 1
fi

# Check if PostgreSQL service is running
if ! pgrep -x "postgres" > /dev/null; then
    echo "📦 Starting PostgreSQL service..."
    brew services start postgresql
    sleep 3
fi

# Create database if it doesn't exist
echo "🔧 Setting up database..."
createdb ai_tutor_sessions 2>/dev/null || echo "Database already exists"

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🚀 Running database migrations..."
npx prisma db push

echo ""
echo "✅ Database setup completed successfully!"
echo ""
echo "Database is running on:"
echo "  - Host: localhost"
echo "  - Port: 5432"
echo "  - Database: ai_tutor_sessions"
echo ""
echo "To stop PostgreSQL: brew services stop postgresql"
