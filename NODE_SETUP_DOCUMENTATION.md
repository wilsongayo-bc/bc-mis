# Node.js Setup Documentation

## Prerequisites
- Node.js 20.x (LTS recommended)
- npm or yarn package manager
- MySQL 8.x database server

## Installation Steps

### 1. Node.js Installation
```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download from nodejs.org
# Verify installation
node --version
npm --version
```

### 2. Project Dependencies
```bash
# Install root dependencies
npm install

# Install API dependencies
cd api
npm install
cd ..
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Configure database settings
# Default local MySQL password: letmein25
```

### 4. Database Setup
```bash
# Start MySQL service
# macOS: brew services start mysql
# Windows: Start MySQL service
# Linux: sudo systemctl start mysql

# Create database
mysql -u root -p
CREATE DATABASE bc_mis;
```

### 5. Run Migrations
```bash
# Run database migrations
npm run migrate
```

### 6. Seed Initial Data
```bash
# Seed database with initial data
npx ts-node api/scripts/seed-data.ts
```

### 7. Start Development Server
```bash
# Start both frontend and backend
npm run dev
```

## Development Scripts
- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database (if configured)

## Troubleshooting
- Ensure Node.js version is 20.x
- Check MySQL service is running
- Verify .env configuration
- Clear node_modules and reinstall if needed

## Production Deployment
See DEPLOYMENT.md for production setup instructions.