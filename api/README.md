# Benedict College MIS API

A production-ready Express.js API server for the Benedict College Management Information System, built with TypeScript, TypeORM, and MySQL.

## 🚀 Quick Start

### Local Development
```bash
# Run the setup script (recommended)
./setup.sh

# Or manually:
npm install
cp .env.template .env
# Edit .env with your database credentials
npm run migrate
npm run dev
```

### Production Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 📁 Project Structure

```
api/
├── src/
│   ├── controllers/     # Route controllers
│   ├── entities/        # TypeORM entities
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── migrations/      # Database migrations
│   └── utils/           # Utility functions
├── config/
│   └── database.ts      # Database configuration
├── app.ts               # Express app setup
├── server.ts            # Server entry point
├── .env.template        # Environment variables template
├── .env.railway         # Railway deployment template
├── railway.json         # Railway configuration
├── Dockerfile           # Docker configuration
├── setup.sh             # Local setup script
└── DEPLOYMENT.md        # Deployment guide
```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run dev:watch` | Start with file watching (nodemon) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run prod` | Build and start production server |
| `npm run migrate` | Run database migrations |
| `npm run migrate:prod` | Run migrations in production |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run health` | Check API health |

## 🌐 API Endpoints

### Health Checks
- `GET /api/health` - Detailed health status
- `GET /api/health/live` - Liveness probe
- `GET /api/health/ready` - Readiness probe

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Core Features
- `GET /api/students` - Student management
- `GET /api/reports` - Report generation
- `GET /api/analytics` - Analytics data
- And many more...

### Documentation
- `GET /api-docs` - Swagger API documentation

## 🗄️ Database

### Configuration
- **Engine**: MySQL 8.x
- **ORM**: TypeORM
- **Migrations**: Automatic with TypeORM
- **Connection Pooling**: Enabled for production

### Local Setup
```bash
# Default credentials (update in .env)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=letmein25
DB_DATABASE=bc_mis
```

### Production Setup
See [DEPLOYMENT.md](./DEPLOYMENT.md) for production database configuration.

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **CORS** configuration for cross-origin requests
- **Rate Limiting** to prevent abuse
- **Input Validation** with proper sanitization
- **Security Headers** for production deployment
- **Environment-based Configuration** for secrets

## 🏥 Health Monitoring

The API includes comprehensive health monitoring:

### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": {
    "connected": true,
    "responseTime": "12ms",
    "connectionCount": 5
  },
  "memory": {
    "used": "45.2 MB",
    "total": "512 MB",
    "percentage": 8.8
  },
  "system": {
    "platform": "linux",
    "nodeVersion": "20.10.0",
    "environment": "production"
  }
}
```

### Monitoring Features
- Database connection health
- Memory usage tracking
- Response time monitoring
- Automatic reconnection logic
- Graceful shutdown handling

## 🚀 Deployment

### Railway (Recommended)
```bash
# 1. Push to GitHub
git push origin main

# 2. Connect to Railway
# Visit railway.app and connect your repo

# 3. Configure environment variables
# See .env.railway for required variables

# 4. Deploy automatically
# Railway deploys on every push to main
```

### Docker
```bash
# Build image
docker build -t bc-mis-api .

# Run container
docker run -p 3000:3000 --env-file .env bc-mis-api
```

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
npm run start
```

## 🔧 Configuration

### Environment Variables
Copy `.env.template` to `.env` and configure:

#### Required Variables
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3001)
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` - Database config
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - JWT signing secrets
- `FRONTEND_URL` - Frontend application URL
- `ALLOWED_ORIGINS` - CORS allowed origins

#### Optional Variables
- `LOG_LEVEL` - Logging level (error/warn/info/debug)
- `BLOB_STORAGE_TOKEN` - File upload token
- `RATE_LIMIT_*` - Rate limiting configuration

### CORS Configuration
The API supports flexible CORS configuration:
```javascript
// Environment-based origins
ALLOWED_ORIGINS=http://localhost:5173,https://your-app.vercel.app

// Automatic origin detection for development
// Supports localhost, 127.0.0.1, and custom domains
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test -- auth.test.ts
```

### Health Check Testing
```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test with npm script
npm run health
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check MySQL service
brew services list | grep mysql

# Test connection
mysql -u root -p -h localhost

# Check environment variables
cat .env | grep DB_
```

#### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```

#### TypeScript Compilation Errors
```bash
# Check TypeScript configuration
npm run typecheck

# Clean build
rm -rf dist/
npm run build
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Enable TypeORM logging
DB_LOGGING=true npm run dev
```

## 📚 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Write JSDoc comments for public APIs

### Database
- Use TypeORM entities for data models
- Create migrations for schema changes
- Never use `synchronize: true` in production
- Use proper indexing for performance

### API Design
- Follow RESTful conventions
- Use proper HTTP status codes
- Include comprehensive error handling
- Document endpoints with Swagger

### Security
- Validate all inputs
- Use parameterized queries
- Implement proper authentication
- Follow OWASP guidelines

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check this README and DEPLOYMENT.md
- **Health Checks**: Use `/api/health` endpoint
- **Logs**: Check application logs for errors
- **Database**: Verify connection and migrations
- **Environment**: Ensure all required variables are set

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Node.js**: 20.x+  
**TypeScript**: 5.x+