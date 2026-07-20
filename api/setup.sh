#!/bin/bash

# Benedict College MIS API - Local Development Setup Script
# This script helps set up the API for local development

set -e  # Exit on any error

echo "🚀 Benedict College MIS API - Local Development Setup"
echo "============================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if we're in the API directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the API directory (where package.json is located)"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
if command -v pnpm &> /dev/null; then
    echo "Using pnpm..."
    pnpm install
elif command -v yarn &> /dev/null; then
    echo "Using yarn..."
    yarn install
else
    echo "Using npm..."
    npm install
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.template .env
    echo "✅ .env file created. Please update it with your actual values."
else
    echo "✅ .env file already exists."
fi

# Check if MySQL is running (optional)
echo "🔍 Checking MySQL connection..."
if command -v mysql &> /dev/null; then
    # Try to connect to MySQL with default credentials
    if mysql -u root -pletmein25 -e "SELECT 1;" &> /dev/null; then
        echo "✅ MySQL connection successful"
        
        # Create database if it doesn't exist
        echo "🗄️ Creating database if it doesn't exist..."
        mysql -u root -pletmein25 -e "CREATE DATABASE IF NOT EXISTS bc_mis;" 2>/dev/null || true
        echo "✅ Database 'bc_mis' is ready"
    else
        echo "⚠️  MySQL connection failed. Please ensure MySQL is running with the correct credentials."
        echo "   Default credentials: username=root, password=letmein25"
        echo "   You can update these in your .env file."
    fi
else
    echo "⚠️  MySQL client not found. Please ensure MySQL is installed and running."
fi

# Run TypeScript type checking
echo "🔍 Running TypeScript type checking..."
if command -v pnpm &> /dev/null; then
    pnpm run typecheck
elif command -v yarn &> /dev/null; then
    yarn typecheck
else
    npm run typecheck
fi

# Run database migrations
echo "🔄 Running database migrations..."
if command -v pnpm &> /dev/null; then
    pnpm run migrate || echo "⚠️  Migration failed. Please check your database connection."
elif command -v yarn &> /dev/null; then
    yarn migrate || echo "⚠️  Migration failed. Please check your database connection."
else
    npm run migrate || echo "⚠️  Migration failed. Please check your database connection."
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file with the correct database credentials"
echo "2. Ensure MySQL is running on your system"
echo "3. Start the development server:"
echo ""
if command -v pnpm &> /dev/null; then
    echo "   pnpm run dev"
elif command -v yarn &> /dev/null; then
    echo "   yarn dev"
else
    echo "   npm run dev"
fi
echo ""
echo "4. The API will be available at: http://localhost:3001"
echo "5. Health check: http://localhost:3001/api/health"
echo "6. API documentation: http://localhost:3001/api-docs"
echo ""
echo "🔧 Useful commands:"
if command -v pnpm &> /dev/null; then
    echo "   pnpm run build     - Build for production"
    echo "   pnpm run test      - Run tests"
    echo "   pnpm run lint      - Run linting"
    echo "   pnpm run migrate   - Run database migrations"
elif command -v yarn &> /dev/null; then
    echo "   yarn build     - Build for production"
    echo "   yarn test      - Run tests"
    echo "   yarn lint      - Run linting"
    echo "   yarn migrate   - Run database migrations"
else
    echo "   npm run build     - Build for production"
    echo "   npm run test      - Run tests"
    echo "   npm run lint      - Run linting"
    echo "   npm run migrate   - Run database migrations"
fi
echo ""
echo "📚 For deployment instructions, see DEPLOYMENT.md"
echo "🆘 For troubleshooting, check the project README"