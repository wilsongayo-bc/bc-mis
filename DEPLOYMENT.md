# Vercel Deployment Guide (Frontend Focus)

This guide explains how to deploy the Benedict College Management Information System Frontend to Vercel.
For the Backend API deployment on a VPS (Recommended for production), please refer to [VPS Deployment Guide](docker/VPS_DEPLOYMENT_GUIDE.md).

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Backend API**: A running instance of the Benedict College MIS API (on VPS or Railway)
3. **Environment Variables**: Connection details

## Environment Variables

Before deploying the frontend, you need to configure the following environment variables in your Vercel project:

### Required Variables
```bash
VITE_API_URL=https://api.your-domain.com
```

### Database Variables (If deploying API to Vercel Serverless - Not Recommended for Production)
If you are attempting to host the API on Vercel as Serverless functions (limitations apply):
```bash
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_DATABASE=bc_mis
```

### Optional Variables
```bash
NODE_ENV=production
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
```

### Vercel Blob Storage (Required for Logo Upload)
```bash
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

**Note**: To get the BLOB_READ_WRITE_TOKEN:
1. Go to your Vercel Dashboard
2. Navigate to Storage → Blob
3. Create a new Blob store or use existing one
4. Copy the Read/Write token from the store settings
5. Add it to your environment variables in Vercel project settings

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Select the repository containing your Benedict College MIS code

### 2. Configure Project Settings

1. **Framework Preset**: Select "Vite" or "Other"
2. **Root Directory**: Leave as `.` (root)
3. **Build Command**: `npm run vercel-build` (automatically configured)
4. **Output Directory**: `dist` (automatically configured)
5. **Install Command**: `npm install` (default)

### 3. Set Environment Variables

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add all the required environment variables listed above
3. Make sure to set them for **Production**, **Preview**, and **Development** environments

### 4. Deploy

1. Click **Deploy** to start the deployment process
2. Vercel will automatically:
   - Install dependencies
   - Build the frontend (React + Vite)
   - Compile the backend API (TypeScript)
   - Deploy serverless functions

## Post-Deployment: Initialize Default Data

After successful deployment, you need to initialize the default data including admin users.

### Method 1: Using the API Endpoint (Recommended)

1. **Check Initialization Status**:
   ```bash
   curl https://your-app.vercel.app/api/init-data/status
   ```

2. **Initialize Data**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/init-data
   ```

3. **Expected Response**:
   ```json
   {
     "success": true,
     "message": "Default data initialized successfully",
     "data": {
       "usersCreated": {
         "admin": "admin@benedictcollege.edu",
         "faculty": "faculty@benedictcollege.edu",
         "staff": "staff@benedictcollege.edu"
       },
       "existingData": {
         "departments": 5,
         "positions": 3,
         "courses": 12,
         "subjects": 15
       },
       "credentials": {
         "defaultPassword": "admin123",
         "note": "Please change default passwords after first login"
       }
     }
   }
   ```

### Method 2: Using Browser

1. Open your browser and navigate to:
   ```
   https://your-app.vercel.app/api/init-data/status
   ```

2. To initialize data, use a tool like Postman or create a simple HTML form to POST to:
   ```
   https://your-app.vercel.app/api/init-data
   ```

## Default User Accounts

After initialization, the following accounts will be created:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Admin | admin@benedictcollege.edu | admin123 | System administrator with full access |
| Faculty | faculty@benedictcollege.edu | admin123 | Faculty member (if departments exist) |
| Staff | staff@benedictcollege.edu | admin123 | Staff member (if positions exist) |

**⚠️ Important**: Change these default passwords immediately after first login!

## Vercel Configuration Files

### `vercel.json`
Configures the deployment settings:
- Static file serving for the frontend
- Serverless function handling for the API
- Route configuration
- Node.js runtime settings

### `package.json` Scripts
- `vercel-build`: Main build command for Vercel
- `build:client`: Builds the React frontend
- `build:api`: Compiles TypeScript API code
- `postinstall`: Ensures API is compiled after dependency installation

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify environment variables are set correctly
   - Check database host accessibility from Vercel
   - Ensure database user has proper permissions

2. **Build Failures**:
   - Check build logs in Vercel dashboard
   - Verify all dependencies are listed in `package.json`
   - Ensure TypeScript compilation succeeds locally

3. **API Routes Not Working**:
   - Verify `vercel.json` configuration
   - Check that API routes are properly exported
   - Ensure database connection is established

4. **Data Initialization Fails**:
   - Check database connection
   - Verify tables exist (run migrations first if needed)
   - Check API logs in Vercel Functions tab

### Debugging

1. **View Deployment Logs**:
   - Go to Vercel Dashboard → Your Project → Functions
   - Click on any function to view logs

2. **Test API Endpoints**:
   ```bash
   # Health check
   curl https://your-app.vercel.app/api/health
   
   # Check initialization status
   curl https://your-app.vercel.app/api/init-data/status
   ```

3. **Local Testing**:
   ```bash
   # Test build process locally
   npm run build
   
   # Test API compilation
   npm run build:api
   ```

## Database Migrations

If you need to run database migrations before data initialization:

1. Ensure your database is accessible
2. Run migrations locally or create a separate API endpoint for migrations
3. The init-data endpoint will work with existing database structure

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to your repository
2. **Default Passwords**: Change immediately after deployment
3. **Database Access**: Use strong passwords and limit database user permissions
4. **HTTPS**: Vercel automatically provides HTTPS for all deployments

## Support

For deployment issues:
1. Check Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
2. Review build and function logs in Vercel dashboard
3. Test API endpoints individually to isolate issues

---

**Next Steps After Deployment**:
1. Initialize default data using the API endpoint
2. Log in with admin credentials
3. Change default passwords
4. Configure system settings
5. Add your actual departments, positions, courses, and subjects
6. Create additional user accounts as needed

Added

git config --global user.name "Wilson Gayo"
git config --global user.email "benedictcollege25@gmail.com"