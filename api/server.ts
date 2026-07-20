/**
 * Production-optimized server entry file for dedicated hosting
 */
import 'reflect-metadata';
import { Server } from 'http';
import type { AddressInfo } from 'net';
import app from './app';
import { initializeDatabase, closeDatabase, monitorDatabaseConnection, runMigrations } from './config/database';

/**
 * Server configuration
 */
const DEFAULT_PORT = 3001;
const REQUESTED_PORT = Number(process.env.PORT) || DEFAULT_PORT;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

/**
 * Global server instance for graceful shutdown
 */
let serverInstance: Server | null = null;

// Production optimizations
if (isProduction) {
  // Trust proxy for Railway/DigitalOcean deployment
  app.set('trust proxy', 1);
  
  // Disable x-powered-by header for security
  app.disable('x-powered-by');
  
  // Set security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
}

/**
 * Initialize database and start server with enhanced monitoring
 */
const startServer = async () => {
  try {
    console.log(`🚀 Starting Benedict College MIS API Server...`);
    console.log(`📍 Environment: ${NODE_ENV}`);
    console.log(`🔧 Port: ${REQUESTED_PORT}`);
    
    // Start HTTP server first for health checks
    console.log('🌐 Starting HTTP server...');
    const listenOnce = (port: number): Promise<Server> =>
      new Promise((resolve, reject) => {
        const server = app.listen(port);
        server.once('listening', () => resolve(server));
        server.once('error', (err: unknown) => reject(err));
      });

    const maxPortAttempts = isProduction ? 1 : 10;
    let portAttempt = REQUESTED_PORT;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxPortAttempts; attempt++) {
      try {
        serverInstance = await listenOnce(portAttempt);
        break;
      } catch (err) {
        lastError = err;
        const e = err as { code?: string };
        if (!isProduction && e?.code === 'EADDRINUSE') {
          portAttempt += 1;
          continue;
        }
        throw err;
      }
    }

    if (!serverInstance) {
      throw lastError ?? new Error('Failed to start HTTP server');
    }

    const address = serverInstance.address();
    const boundPort = typeof address === 'object' && address ? (address as AddressInfo).port : portAttempt;

    console.log(`✅ Server is running on port ${boundPort}`);
    console.log(`🔗 Health check: http://localhost:${boundPort}/api/health/live`);
    if (!isProduction) {
      console.log(`📚 API Documentation: http://localhost:${boundPort}/api-docs`);
    }

    // Initialize database connection in background (non-blocking)
    console.log('🔄 Initializing database connection in background...');
    initializeDatabase().then(async () => {
      console.log('✅ Database connection established');
      
      // Auto-run migrations after database is connected
      if (process.env.AUTO_MIGRATE !== 'false') {
        console.log('🔄 Running database migrations...');
        try {
          await runMigrations();
          console.log('✅ Database migrations completed');
        } catch (migrationError) {
          console.error('⚠️  Migration failed:', migrationError);
          // Don't exit - let the server continue running
        }
      } else {
        console.log('ℹ️  Auto-migration disabled (AUTO_MIGRATE=false)');
      }
    }).catch((error) => {
      console.error('❌ Database initialization failed:', error);
      // Don't exit the process - let the server continue running for health checks
    });
    
    // Set server timeout for long-running requests
    serverInstance.timeout = 120000; // 2 minutes
    serverInstance.keepAliveTimeout = 65000; // 65 seconds
    serverInstance.headersTimeout = 66000; // 66 seconds (slightly higher than keepAliveTimeout)
    
    // Setup database monitoring in production
    if (isProduction) {
      console.log('🔍 Setting up database connection monitoring...');
      const monitorInterval = setInterval(async () => {
        try {
          await monitorDatabaseConnection();
        } catch (error) {
          console.error('❌ Database monitoring error:', error);
        }
      }, 300000); // Check every 5 minutes
      
      // Clear monitoring on server close
      serverInstance.on('close', () => {
        clearInterval(monitorInterval);
      });
    }
    
    return serverInstance;
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    
    // Attempt to close database connection before exit
    try {
      await closeDatabase();
    } catch (dbError) {
      console.error('❌ Error closing database during startup failure:', dbError);
    }
    
    process.exit(1);
  }
};

/**
 * Enhanced graceful shutdown with server cleanup
 */
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
  
  const shutdownTimeout = setTimeout(() => {
    console.error('⏰ Shutdown timeout reached. Forcing exit...');
    process.exit(1);
  }, 30000); // 30 second timeout
  
  try {
    // Stop accepting new connections
    if (serverInstance) {
      console.log('🔌 Closing HTTP server...');
      await new Promise<void>((resolve, reject) => {
        serverInstance!.close((err: unknown) => {
          if (err) {
            console.error('❌ Error closing HTTP server:', err);
            reject(err);
          } else {
            console.log('✅ HTTP server closed');
            resolve();
          }
        });
      });
    }
    
    // Close database connection
    console.log('🗄️ Closing database connection...');
    await closeDatabase();
    console.log('✅ Database connection closed');
    
    // Clear shutdown timeout
    clearTimeout(shutdownTimeout);
    
    console.log('🎯 Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('💥 Error during shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

// Start the server using IIFE to avoid top-level await
(async () => {
  await startServer();

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
})();

export default app;
