# Benedict College MIS API - Deployment Guide

This guide covers deploying the Benedict College MIS API as a separate service using Railway (recommended) or other cloud platforms.

## 🚀 Quick Start - Railway Deployment

### Prerequisites
- Railway account ([railway.app](https://railway.app))
- GitHub repository with your code
- Basic understanding of environment variables

### Step 1: Prepare Your Repository
1. Ensure all files are committed to your GitHub repository
2. The API code should be in the `/api` directory
3. Verify `railway.json`, `Dockerfile`, and updated `package.json` are present

### Step 2: Create Railway Project
1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will automatically detect the configuration

### Step 3: Configure Environment Variables
In Railway's dashboard, go to your project → Variables and add:

```bash
# Required Variables
NODE_ENV=production
JWT_SECRET=your-32-char-secret-here
JWT_REFRESH_SECRET=your-32-char-refresh-secret
FRONTEND_URL=https://your-frontend-domain.com
ALLOWED_ORIGINS=https://your-frontend-domain.com

# Database (if using Railway MySQL plugin)
# These are auto-populated by Railway's MySQL plugin
DB_HOST=${{MYSQL_HOST}}
DB_PORT=${{MYSQL_PORT}}
DB_USERNAME=${{MYSQL_USER}}
DB_PASSWORD=${{MYSQL_PASSWORD}}
DB_DATABASE=${{MYSQL_DATABASE}}
```

### Step 4: Add MySQL Database
1. In Railway dashboard, click "New Service"
2. Select "Database" → "MySQL"
3. Railway will automatically create and link the database
4. Environment variables will be auto-populated

### Step 5: Deploy
1. Railway will automatically deploy when you push to your main branch
2. Monitor the build logs in Railway's dashboard
3. Once deployed, you'll get a public URL like `https://your-api.railway.app`

## 🔧 Environment Variables Reference

### Core Configuration
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `production` | ✅ |
| `PORT` | Server port | `3000` | ✅ |
| `JWT_SECRET` | JWT signing secret | `your-32-char-secret` | ✅ |
| `JWT_REFRESH_SECRET` | Refresh token secret | `your-32-char-secret` | ✅ |
| `FRONTEND_URL` | Frontend application URL | `https://app.vercel.app` | ✅ |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://app.vercel.app,https://api.railway.app` | ✅ |

### Database Configuration
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | Database host | `containers-us-west-xxx.railway.app` | ✅ |
| `DB_PORT` | Database port | `3306` | ✅ |
| `DB_USERNAME` | Database username | `root` | ✅ |
| `DB_PASSWORD` | Database password | `secure-password` | ✅ |
| `DB_DATABASE` | Database name | `railway` | ✅ |

### Optional Configuration
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_EXPIRES_IN` | JWT expiration time | `15m` | ❌ |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `7d` | ❌ |
| `LOG_LEVEL` | Logging level | `info` | ❌ |
| `BLOB_STORAGE_TOKEN` | File upload token | - | ❌ |

## 🔒 Security Checklist

### Before Deployment
- [ ] Generate strong JWT secrets (32+ characters)
- [ ] Use secure database passwords
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Disable database synchronization (`DB_SYNCHRONIZE=false`)
- [ ] Set appropriate log levels

### After Deployment
- [ ] Test all API endpoints
- [ ] Verify CORS configuration with frontend
- [ ] Check health endpoints (`/api/health`)
- [ ] Monitor application logs
- [ ] Test database connectivity
- [ ] Verify JWT authentication works

## 🏥 Health Checks

The API provides several health check endpoints:

- **`GET /api/health`** - Detailed health status with database info
- **`GET /api/health/live`** - Simple liveness probe
- **`GET /api/health/ready`** - Readiness probe with database check

Example health check response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": {
    "connected": true,
    "responseTime": "12ms"
  },
  "memory": {
    "used": "45.2 MB",
    "total": "512 MB"
  }
}
```

## 📊 Monitoring & Logging

### Railway Monitoring
- Use Railway's built-in logging dashboard
- Monitor CPU and memory usage
- Set up alerts for downtime

### Application Logs
The API provides structured logging with different levels:
- `error` - Critical errors only
- `warn` - Warnings and errors
- `info` - General information (default)
- `debug` - Detailed debugging info

### Key Metrics to Monitor
- Response times
- Database connection health
- Memory usage
- Error rates
- Request volume

## 🔄 Database Migrations

### Running Migrations
```bash
# In production (Railway)
npm run migrate:prod

# Local development
npm run migrate
```

### Migration Files
- Located in `src/migrations/`
- Auto-generated with TypeORM
- Run automatically on deployment

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```
Error: connect ECONNREFUSED
```
**Solution:**
- Check database environment variables
- Verify database service is running
- Check firewall/network settings

#### 2. CORS Errors
```
Access to fetch at 'api-url' from origin 'frontend-url' has been blocked by CORS policy
```
**Solution:**
- Add frontend URL to `ALLOWED_ORIGINS`
- Verify `FRONTEND_URL` is set correctly
- Check CORS middleware configuration

#### 3. JWT Authentication Errors
```
JsonWebTokenError: invalid signature
```
**Solution:**
- Verify `JWT_SECRET` matches between deployments
- Check token expiration settings
- Ensure secrets are properly set

#### 4. Build Failures
```
Error: Cannot find module 'typescript'
```
**Solution:**
- Check `package.json` dependencies
- Verify build scripts are correct
- Clear Railway build cache

### Debug Commands
```bash
# Check environment variables
npm run health

# Test database connection
npm run migrate

# Verify TypeScript compilation
npm run typecheck

# Run linting
npm run lint
```

## 🔄 CI/CD Pipeline

### Automatic Deployment
Railway automatically deploys when:
1. Code is pushed to the main branch
2. Environment variables are updated
3. Manual deployment is triggered

### Deployment Process
1. **Build Phase**: Install dependencies and compile TypeScript
2. **Test Phase**: Run health checks and migrations
3. **Deploy Phase**: Start the production server
4. **Health Check**: Verify deployment success

### Rollback Strategy
- Railway keeps previous deployments
- Can rollback through dashboard
- Database migrations may need manual reversal

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [TypeORM Documentation](https://typeorm.io/)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Production Checklist](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## 🆘 Support

For deployment issues:
1. Check Railway logs first
2. Verify environment variables
3. Test health endpoints
4. Review this documentation
5. Check the main project README for additional help

---

**Last Updated**: January 2024  
**Version**: 1.0.0