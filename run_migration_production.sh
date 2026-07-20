#!/bin/bash

# Script to run database migrations in production
# This script calls the /api/migrate endpoint to create all tables

echo "🚀 Starting database migration for production..."
echo "📡 Calling migration endpoint..."

# Replace YOUR_DOMAIN with your actual Vercel domain
DOMAIN="https://your-vercel-domain.vercel.app"

# Make POST request to migration endpoint
response=$(curl -s -X POST "$DOMAIN/api/migrate" \
  -H "Content-Type: application/json" \
  -w "HTTP_STATUS:%{http_code}")

# Extract HTTP status code
http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
response_body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "📊 Response Status: $http_status"
echo "📄 Response Body:"
echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"

if [ "$http_status" = "200" ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed with status $http_status"
    exit 1
fi