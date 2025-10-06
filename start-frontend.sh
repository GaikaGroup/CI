#!/bin/bash

# Check if database is running (adjust based on your DB type)
echo "Checking database connection..."

# Start the database if needed (uncomment based on your setup)
# For PostgreSQL via Docker:
# docker start postgres-db 2>/dev/null || docker run -d --name postgres-db -p 5432:5432 -e POSTGRES_PASSWORD=yourpassword postgres

# For MySQL via Docker:
# docker start mysql-db 2>/dev/null || docker run -d --name mysql-db -p 3306:3306 -e MYSQL_ROOT_PASSWORD=yourpassword mysql

# For SQLite (no separate process needed)
# echo "Using SQLite database..."

# Ensure Prisma client is generated
echo "Ensuring Prisma client is up to date..."
npx prisma generate

# Start the frontend in development mode
echo "Starting the AI Tutor Frontend on port 3000..."
npm run dev

# If you want to build and preview the production version, uncomment the following lines
# npm run build
# npm run preview