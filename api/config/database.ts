import { DataSource, type DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Dweezil's Code - Load environment variables from parent directory
// This allows scripts in api folder to access root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Fallback to api/.env if exists

// Import all entities explicitly to ensure they're loaded
// NOTE: Import GradeLevel BEFORE Student to resolve circular dependency!
import { User } from '../entities/User';
import { GradeLevel } from '../entities/GradeLevel';
import { Student } from '../entities/Student';
import { Employee } from '../entities/Employee';
import { Course } from '../entities/Course';
import { CourseSection } from '../entities/CourseSection';
import { Subject } from '../entities/Subject';
import { SubjectPrerequisite } from '../entities/SubjectPrerequisite';
import { Department } from '../entities/Department';
import { Position } from '../entities/Position';
import { Enrollment } from '../entities/Enrollment';
import { Schedule } from '../entities/Schedule';
import { Payment } from '../entities/Payment';
import { Book } from '../entities/Book';
import { BorrowRecord } from '../entities/BorrowRecord';
import { Settings } from '../entities/Settings';
import { DocumentCategory } from '../entities/DocumentCategory';
import { DocumentRequirement } from '../entities/DocumentRequirement';
import { StudentDocument } from '../entities/StudentDocument';
import { ReportTemplate } from '../entities/ReportTemplate';
import { ScheduledReport } from '../entities/ScheduledReport';
import { ReportCache } from '../entities/ReportCache';
import { AcademicYear } from '../entities/AcademicYear';
import { ActivityLog } from '../entities/ActivityLog';
import { Bank } from '../entities/Bank';
import { Fee } from '../entities/Fee';
import { EmailVerificationRequest } from '../entities/EmailVerificationRequest';
import { PasswordResetRequest } from '../entities/PasswordResetRequest';

const isProduction = process.env.NODE_ENV === 'production';
const finalHostEnv = process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost';
const isRemoteDB = finalHostEnv !== 'localhost';
const isContainerMySQLHost = finalHostEnv === 'mysql';

/**
 * Parse MySQL URL connection string
 */
const parseMySQLUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 3306,
      username: parsed.username,
      password: parsed.password,
      database: parsed.pathname.slice(1) // Remove leading slash
    };
  } catch (error) {
    console.error('❌ Failed to parse MYSQL_URL:', error);
    return null;
  }
};

// Parse connection details from MYSQL_URL if available, otherwise use individual variables
const connectionConfig = process.env.MYSQL_URL 
  ? parseMySQLUrl(process.env.MYSQL_URL)
  : null;

/**
 * Database configuration for TypeORM
 * Optimized for both local and remote MySQL connections
 * Supports Railway MySQL plugin environment variables with MYSQL_URL as primary method
 */
export const AppDataSource = new DataSource({
  type: 'mysql',
  // Use MYSQL_URL if available (Railway's preferred method), otherwise fall back to individual variables
  host: connectionConfig?.host || finalHostEnv,
  port: connectionConfig?.port || parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
  username: connectionConfig?.username || process.env.MYSQL_USER || process.env.DB_USERNAME || 'root',
  password: connectionConfig?.password || process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
  database: connectionConfig?.database || process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'bc_mis',
  
  // Use synchronize for development and when explicitly forced
  // In production, we prefer migrations but allow sync if forced or no migrations exist
  // Disable synchronization for remote databases to avoid conflicts
  synchronize: process.env.DB_SYNCHRONIZE === 'true' || (process.env.NODE_ENV !== 'production' && !isRemoteDB && process.env.DB_SYNCHRONIZE !== 'false') || process.env.FORCE_SYNC === 'true',
  
  // Enable logging for development and debugging
  logging: process.env.DB_LOGGING === 'false' || (!isProduction && process.env.NODE_ENV !== 'test'),
  
  // Explicitly define entities to avoid path resolution issues
  entities: [
    User, GradeLevel, Student, Employee, Course, CourseSection, Subject, SubjectPrerequisite,
    Department, Position, Enrollment, Schedule, Payment,
    Book, BorrowRecord, Settings,
    DocumentCategory, DocumentRequirement, StudentDocument,
    ReportTemplate, ScheduledReport, ReportCache, AcademicYear, ActivityLog, Bank, Fee, EmailVerificationRequest, PasswordResetRequest
  ],
  
  // Migration configuration
  migrations: [
    path.join(__dirname, '../migrations/**/*{.ts,.js}')
  ],
  
  // Subscriber configuration
  subscribers: [
    path.join(__dirname, '../subscribers/**/*{.ts,.js}')
  ],
  
  // Enhanced connection pool and SSL configuration for production deployment
  extra: {
    // Connection pool settings optimized for Railway/dedicated hosting
    connectionLimit: isProduction ? 20 : 5,
    connectTimeout: 10000,
    
    // Connection management - using only valid MySQL2 options
    idleTimeout: 300000, // 5 minutes idle timeout
    
    ...(isRemoteDB && !isContainerMySQLHost && {
      ssl: {
        rejectUnauthorized: false,
        ...(isProduction && {
          minVersion: 'TLSv1.2',
          ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384'
        })
      }
    }),
    
    // MySQL specific optimizations
    charset: 'utf8mb4',
    timezone: '+00:00',
    dateStrings: false,
    supportBigNumbers: true,
    bigNumberStrings: false,
    
    ...(isProduction && {
      multipleStatements: false,
      trace: false,
      debug: false
    })
  },
  
  // Additional options for better reliability
  maxQueryExecutionTime: 30000,
  dropSchema: false,
  migrationsRun: false, // We'll handle migrations manually
  
  // Entity metadata validation
  entitySkipConstructor: false
});

// Global connection state
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Initialize database connection with retry logic and proper error handling
 */
export const initializeDatabase = async (maxRetries: number = 3): Promise<void> => {
  // Prevent multiple simultaneous initialization attempts
  if (isInitializing) {
    if (initializationPromise) {
      await initializationPromise;
      return;
    }
    throw new Error('Database initialization already in progress');
  }

  isInitializing = true;
  
  try {
    initializationPromise = (async () => {
      let lastError: Error | null = null;
      
      // Log environment variables for debugging (without sensitive data)
      console.log('🔍 Database configuration:');
      console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`  - Connection method: ${process.env.MYSQL_URL ? 'MYSQL_URL' : 'Individual variables'}`);
      console.log(`  - MYSQL_URL: ${process.env.MYSQL_URL ? '[SET]' : '[NOT SET]'}`);
      console.log(`  - Railway MySQL vars: HOST=${process.env.MYSQL_HOST ? '[SET]' : '[NOT SET]'}, PORT=${process.env.MYSQL_PORT ? '[SET]' : '[NOT SET]'}`);
      console.log(`  - Legacy DB vars: HOST=${process.env.DB_HOST ? '[SET]' : '[NOT SET]'}, PORT=${process.env.DB_PORT ? '[SET]' : '[NOT SET]'}`);
      const mysqlOptions = AppDataSource.options as DataSourceOptions & { host?: string; port?: number; database?: string; password?: string };
      console.log(`  - Final config: HOST=${mysqlOptions.host}, PORT=${mysqlOptions.port}, DB=${mysqlOptions.database}`);
      
      // Validate that we have the necessary connection information
      if (!mysqlOptions.host || !mysqlOptions.database) {
        throw new Error('❌ Missing required database connection parameters. Please ensure Railway MySQL plugin is properly configured.');
      }
      
      if (!mysqlOptions.password && process.env.NODE_ENV === 'production') {
        console.warn('⚠️  No database password configured for production environment');
      }
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Database initialization attempt ${attempt}/${maxRetries}`);
          
          // Check if already initialized
          if (AppDataSource.isInitialized) {
            console.log('✅ Database already initialized');
            return;
          }
          
          // Initialize the data source
          console.log('🔌 Connecting to database...');
          await AppDataSource.initialize();
          
          // Test the connection
          console.log('🧪 Testing database connection...');
          await AppDataSource.query('SELECT 1 as test');
          
          // Get table count for verification
          const tables = await AppDataSource.query('SHOW TABLES');
          console.log(`📊 Found ${tables.length} existing tables in database`);
          
          console.log('✅ Database connection established successfully');
          console.log(`📊 Connected to database: ${AppDataSource.options.database}`);
          console.log(`🏗️  Synchronize mode: ${AppDataSource.options.synchronize ? 'ON' : 'OFF'}`);
          
          if (AppDataSource.options.synchronize) {
            console.log('🔄 TypeORM will automatically create/update tables');
          }
          
          return;
          
        } catch (error) {
          lastError = error as Error;
          console.error(`❌ Database initialization attempt ${attempt} failed:`);
          console.error(`   Error type: ${error.constructor.name}`);
          console.error(`   Error message: ${error.message}`);
          const e = error as { code?: string; errno?: number; syscall?: string };
          console.error(`   Error code: ${e.code || 'N/A'}`);
          console.error(`   Error errno: ${e.errno ?? 'N/A'}`);
          console.error(`   Error syscall: ${e.syscall || 'N/A'}`);
          console.error(`   Full error:`, error);
          
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
            console.log(`⏳ Retrying in ${delay}ms...`);
            await sleep(delay);
          }
        }
      }
      
      throw new Error(`Failed to initialize database after ${maxRetries} attempts. Last error: ${lastError?.message}`);
    })();
    
    await initializationPromise;
    
  } finally {
    isInitializing = false;
    initializationPromise = null;
  }
};

/**
 * Run database migrations manually
 */
export const runMigrations = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await initializeDatabase();
    }
    
    console.log('🔄 Running database migrations...');
    const migrations = await AppDataSource.runMigrations();
    
    if (migrations.length > 0) {
      console.log(`✅ Successfully ran ${migrations.length} migrations:`);
      migrations.forEach(migration => {
        console.log(`   - ${migration.name}`);
      });
    } else {
      console.log('ℹ️  No pending migrations to run');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

/**
 * Check database connection health with detailed information
 */
export const checkDatabaseHealth = async (): Promise<{
  healthy: boolean;
  details: {
    connected: boolean;
    queryTime?: number;
    connectionCount?: number;
    error?: string;
  };
}> => {
  const startTime = Date.now();
  
  try {
    if (!AppDataSource.isInitialized) {
      return {
        healthy: false,
        details: {
          connected: false,
          error: 'Database not initialized'
        }
      };
    }
    
    // Test basic connectivity
    await AppDataSource.query('SELECT 1 as health_check');
    const queryTime = Date.now() - startTime;
    
    // Get connection pool information if available
    let connectionCount: number | undefined;
    try {
      const poolInfo = await AppDataSource.query('SHOW STATUS LIKE "Threads_connected"');
      connectionCount = poolInfo[0]?.Value ? parseInt(poolInfo[0].Value) : undefined;
    } catch {
      // Ignore if we can't get connection count
    }
    
    return {
      healthy: true,
      details: {
        connected: true,
        queryTime,
        connectionCount
      }
    };
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return {
      healthy: false,
      details: {
        connected: false,
        queryTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};

/**
 * Monitor database connection and attempt reconnection if needed
 */
export const monitorDatabaseConnection = async (): Promise<void> => {
  const healthCheck = await checkDatabaseHealth();
  
  if (!healthCheck.healthy) {
    console.warn('⚠️  Database connection unhealthy, attempting reconnection...');
    
    try {
      // Close existing connection if it exists
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      
      // Reinitialize connection
      await initializeDatabase(3);
      console.log('✅ Database reconnection successful');
    } catch (error) {
      console.error('❌ Database reconnection failed:', error);
      throw error;
    }
  }
};

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};
