import { Router } from 'express';
import { AppDataSource } from '../config/database';

const router = Router();

// Database connectivity test endpoint
router.get('/', async (req, res) => {
  try {
    // Test basic connection
    if (!AppDataSource.isInitialized) {
      return res.status(500).json({
        error: 'Database not initialized',
        config: {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          username: process.env.DB_USERNAME,
          database: process.env.DB_DATABASE,
          hasPassword: !!process.env.DB_PASSWORD
        }
      });
    }

    // Test query execution
    const result = await AppDataSource.query('SELECT 1 as test');
    
    // Get database info
    const dbInfo = await AppDataSource.query('SELECT DATABASE() as current_db, VERSION() as version');
    
    // Check tables
    const tables = await AppDataSource.query('SHOW TABLES');
    
    res.json({
      status: 'connected',
      testQuery: result,
      databaseInfo: dbInfo,
      tables: tables,
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        database: process.env.DB_DATABASE,
        hasPassword: !!process.env.DB_PASSWORD
      }
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      error: 'Database connection failed',
      details: error.message,
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        database: process.env.DB_DATABASE,
        hasPassword: !!process.env.DB_PASSWORD
      }
    });
  }
});

export default router;