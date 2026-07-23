/**
 * This is a API server
 */

import express, { type Request, type Response, type NextFunction }  from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import authRoutes from './routes/auth';
import twoFactorRoutes from './routes/twoFactor';
import settingsRoutes from './routes/settings';
import usersRoutes from './routes/users';
import studentsRoutes from './routes/students';
import coursesRoutes from './routes/courses';
import enrollmentsRoutes from './routes/enrollments';
import paymentsRoutes from './routes/payments';
import schedulesRoutes from './routes/schedules';
import teachersRoutes from './routes/teachers';
import booksRoutes from './routes/books';
import borrowrecordsRoutes from './routes/borrowrecords';
import employeesRoutes from './routes/employees';
import departmentsRoutes from './routes/departments';
import courseSectionsRoutes from './routes/course-sections';
import analyticsRoutes from './routes/analytics';
import subjectsRoutes from './routes/subjects';
import positionsRoutes from './routes/positions';
import bankRoutes from './routes/banks';
import initDataRoutes from './routes/init-data';
import dbTestRoutes from './routes/db-test';
import migrateRoutes from './routes/migrate';
import seedRoutes from './routes/seed';
import gradeLevelsRoutes from './routes/grade-levels';
import academicYearsRoutes from './routes/academic-years';
import documentCategoriesRoutes from './routes/document-categories';
import documentRequirementsRoutes from './routes/document-requirements';
import studentDocumentsRoutes from './routes/student-documents';
import reportsRoutes from './routes/reports';
import pdfRoutes from './routes/pdf';
import publicPreListingRoutes from './routes/public-prelisting';
import activityLogsRoutes from './routes/activity-logs';
import feesRoutes from './routes/fees';
import meRoutes from './routes/me';
import emailVerificationRoutes from './routes/email-verification';
import passwordResetRoutes from './routes/password-reset';
import { activityLogMiddleware } from './middleware/activityLog';
import { resolveUploadsDir } from './utils/uploads';

// load env
dotenv.config();

const app: express.Application = express();
app.set('trust proxy', 1);

/**
 * Enhanced CORS configuration for production deployment with Vercel frontend
 * Combines both approaches for maximum flexibility and security
 */
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: string | boolean) => void) {
    const normalizeOrigin = (value: string): string =>
      value.trim().replace(/^['"`]+|['"`]+$/g, '').replace(/,+$/g, '').replace(/\/+$/g, '');

    const corsOrigins = process.env.CORS_ORIGIN?.split(',').map(normalizeOrigin).filter(Boolean) || [];
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(normalizeOrigin).filter(Boolean) || [];
    
    // Default allowed origins for development and production
    const defaultOrigins = [
      'http://localhost:3000',           // Local React dev server
      'http://localhost:5173',           // Local Vite dev server
      'https://bc-mis.vercel.app',   // Production frontend (Vercel)
      'https://mis.benedictcollege.com', // Custom domain
      process.env.FRONTEND_URL ? normalizeOrigin(process.env.FRONTEND_URL) : undefined,
      ...(corsOrigins.length > 0 ? corsOrigins : []) // Support old CORS_ORIGIN format
    ].filter(Boolean); // Remove undefined/null values
    
    // Combine all origins and remove duplicates
    const allAllowedOrigins = [...new Set([...allowedOrigins, ...defaultOrigins])].map(normalizeOrigin);
    const normalizedOrigin = origin ? normalizeOrigin(origin) : undefined;
    
    // Allow requests with no origin (mobile apps, Postman, etc.) in development
    if (!normalizedOrigin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production' && normalizedOrigin) {
      if (/^http:\/\/localhost:\d+$/.test(normalizedOrigin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(normalizedOrigin)) {
        return callback(null, normalizedOrigin);
      }
    }

    if (normalizedOrigin && allAllowedOrigins.includes(normalizedOrigin)) {
      return callback(null, normalizedOrigin);
    }

    console.warn(`🚫 CORS blocked request from origin: ${origin}`);
    console.log(`📋 Allowed origins: ${allAllowedOrigins.join(', ')}`);
    return callback(new Error('Not allowed by CORS policy'), false);
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name',
    'X-CSRF-Token' // Support CSRF tokens
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Content-Disposition',
    'Authorization' // Expose auth headers
  ],
  maxAge: 86400, // 24 hours preflight cache
  optionsSuccessStatus: 200 // For legacy browser support
};

const enableExpressCors = process.env.ENABLE_EXPRESS_CORS !== 'false';
if (enableExpressCors) {
  app.use(cors(corsOptions));
}
// Enhanced body parsing with better limits for production
app.use(express.json({ 
  limit: '10mb',
  verify: (req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) => {
    (req as Request & { rawBody?: Buffer }).rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000 // Prevent parameter pollution attacks
}));

// Activity logging for CRUD operations
app.use(activityLogMiddleware);

// Serve static files from public directory (for uploaded files)
app.use('/uploads', express.static(resolveUploadsDir()));
// Fallback explicit file serving to avoid static middleware edge cases in dev
app.get('/uploads/prelisting/:filename', (req: Request, res: Response) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(resolveUploadsDir(), 'prelisting', safeName);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ success: false, message: 'File not found', path: req.originalUrl });
    }
  });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/borrow-records', borrowrecordsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/course-sections', courseSectionsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/init-data', initDataRoutes);
app.use('/api/db-test', dbTestRoutes);
app.use('/api/migrate', migrateRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/grade-levels', gradeLevelsRoutes);
app.use('/api/academic-years', academicYearsRoutes);
app.use('/api/document-categories', documentCategoriesRoutes);
app.use('/api/document-requirements', documentRequirementsRoutes);
// Dweezil's Code - Issue #4: Debug logging for student-documents route registration
console.log('✅ Registering student-documents routes at /api/student-documents');
app.use('/api/student-documents', studentDocumentsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/public', publicPreListingRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/me', meRoutes);
app.use('/api/email-verification', emailVerificationRoutes);
app.use('/api/password-reset', passwordResetRoutes);

/**
 * Enhanced health check endpoints for production monitoring
 */
app.get('/api/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Import database health check function
    const { checkDatabaseHealth } = await import('./config/database');
    
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    const responseTime = Date.now() - startTime;
    
    const healthStatus = {
      status: dbHealth.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      responseTime: `${responseTime}ms`,
      database: {
        connected: dbHealth.details.connected,
        queryTime: dbHealth.details.queryTime ? `${dbHealth.details.queryTime}ms` : undefined,
        connectionCount: dbHealth.details.connectionCount,
        error: dbHealth.details.error
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      }
    };
    
    // Return appropriate status code
    const statusCode = dbHealth.healthy ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Liveness probe - simple endpoint for container orchestration
app.get('/api/health/live', (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

// Readiness probe - checks if app is ready to serve traffic
app.get('/api/health/ready', async (req: Request, res: Response): Promise<void> => {
  try {
    const { checkDatabaseHealth } = await import('./config/database');
    const dbHealth = await checkDatabaseHealth();
    
    if (dbHealth.healthy) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: dbHealth.details.error
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Simple test endpoint without database
app.get('/api/test', (req: express.Request, res: express.Response) => {
  res.json({ 
    message: 'API is working', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: 'v5-cache-fix'
  });
});

/**
 * Enhanced error handling middleware
 */
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  
  // Handle specific error types
  if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: (err as { errors?: unknown }).errors
    });
  }
  
  if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access'
    });
  }
  
  // Generic error response
  const status = (err && typeof err === 'object' && 'status' in err) ? (err as { status?: number }).status : 500;
  const message = (err instanceof Error ? err.message : undefined) || 'Internal server error';
  const stack = err instanceof Error ? err.stack : undefined;
  res.status(status || 500).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack })
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

export default app;
