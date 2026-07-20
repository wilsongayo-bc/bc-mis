# Development Setup Guide

This guide will help you set up the Coldea MIS development environment and troubleshoot common issues.

## Quick Start

### Prerequisites
- Node.js 20.x
- MySQL 8.x
- npm or yarn

### Environment Setup

1. **Clone and install dependencies:**
   ```bash
   cd bc-mis
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   DB_HOST=localhost
   DB_USERNAME=your_username
   DB_PASSWORD=letmein25
   DB_DATABASE=bc_mis
   JWT_SECRET=your_secure_jwt_secret_key_here
   ```

3. **Start the development servers:**
   ```bash
   # Option 1: Start both frontend and backend together (recommended)
   npm run dev

   # Option 2: Start servers separately
   npm run client:dev    # Frontend only (port 5173)
   npm run server:dev    # Backend only (port 3001)
   ```

## Common Issues and Solutions

### 🚨 `net::ERR_INSUFFICIENT_RESOURCES` Error

**Problem:** You see this error when trying to load data from the API.

**Cause:** The backend server is not running on port 3001.

**Solution:**
1. Start the backend server:
   ```bash
   npm run server:dev
   ```
   Or start both frontend and backend:
   ```bash
   npm run dev
   ```

2. Verify the server is running by checking the console output for:
   ```
   Server ready on port 3001
   ```

### 🔌 Connection Status Check

The application includes a built-in connection status checker. If you see connection issues:

1. Check the connection status in the UI (if implemented)
2. Manually test the backend health endpoint:
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should return a JSON response indicating the system is healthy (e.g., `{"status": "healthy", ...}`).

### 🗄️ Database Issues

**Problem:** Database connection errors.

**Solutions:**
1. Ensure MySQL is running
2. Verify database credentials in `.env`
3. Create the database if it doesn't exist:
   ```sql
   CREATE DATABASE bc_mis;
   ```
4. Run database initialization:
   ```bash
   npm run db:init
   ```

### 🔧 Build Issues

**Problem:** TypeScript or ESLint errors.

**Solutions:**
1. Check for type errors:
   ```bash
   npm run check
   ```
2. Check for linting issues:
   ```bash
   npm run lint
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Development Workflow

### Starting Development
1. Start the development servers:
   ```bash
   npm run dev
   ```
2. Open your browser to `http://localhost:5173`
3. The backend API will be available at `http://localhost:3001`

### Shared UI Components
- Page Size Dropdown: see `docs/setup.md` for usage and integration
- Architecture decision: see `docs/adr/002-page-size-dropdown-standardization.md`

### Making Changes
1. Frontend changes are hot-reloaded automatically
2. Backend changes restart the server automatically (via nodemon)
3. Database schema changes require running migrations

### Testing
1. Run type checking: `npm run check`
2. Run linting: `npm run lint`
3. Build for production: `npm run build`

## Architecture Overview

### Frontend (Port 5173)
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **State Management:** Redux Toolkit
- **Routing:** React Router

### Backend (Port 3001)
- **Framework:** Express.js + TypeScript
- **Database:** MySQL 8.x with TypeORM
- **Authentication:** JWT tokens
- **API:** RESTful endpoints under `/api`

### Proxy Configuration
The Vite development server proxies `/api/*` requests to `http://localhost:3001` automatically.

## Troubleshooting Checklist

When experiencing issues, check these in order:

1. ✅ **Backend server running?**
   - Look for "Server ready on port 3001" in console
   - Test: `curl http://localhost:3001/api/health`

2. ✅ **Database connected?**
   - Check console for database connection messages
   - Verify `.env` database credentials

3. ✅ **Frontend proxy working?**
   - Check browser network tab for failed requests
   - Verify Vite proxy configuration in `vite.config.ts`

4. ✅ **No TypeScript/ESLint errors?**
   - Run `npm run check` and `npm run lint`
   - Fix any reported issues

5. ✅ **Dependencies up to date?**
   - Run `npm install` to ensure all packages are installed

## Error Messages and Solutions

### "Unable to connect to the server"
- **Cause:** Backend server not running
- **Solution:** Run `npm run server:dev` or `npm run dev`

### "Authentication required"
- **Cause:** JWT token expired or missing
- **Solution:** Log out and log back in

### "Network error. Please check your connection"
- **Cause:** Various network issues
- **Solutions:** 
  - Check if backend server is running
  - Verify proxy configuration
  - Check browser console for detailed errors

## Getting Help

1. Check the console logs for detailed error messages
2. Use the browser's Network tab to inspect failed requests
3. Verify all services are running with the checklist above
4. Check this documentation for common solutions

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both frontend and backend |
| `npm run client:dev` | Start frontend only |
| `npm run server:dev` | Start backend only |
| `npm run build` | Build for production |
| `npm run check` | TypeScript type checking |
| `npm run lint` | ESLint code quality check |
| `npm run db:init` | Initialize database tables |
| `npm run migrate-data` | Run data migration scripts |
