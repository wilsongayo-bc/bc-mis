import { Router, Request, Response } from 'express';
import { AppDataSource, initializeDatabase } from '../config/database';

const router = Router();

/**
 * Run database migrations
 * POST /api/migrate
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔄 Starting database migration...');
    
    // Initialize database connection
    await initializeDatabase();
    
    if (!AppDataSource.isInitialized) {
      res.status(500).json({
        success: false,
        message: 'Database connection not initialized'
      });
      return;
    }

    // Run pending migrations
    const migrations = await AppDataSource.runMigrations();
    
    console.log(`✅ Migrations completed. ${migrations.length} migrations executed.`);
    
    res.status(200).json({
      success: true,
      message: `Migrations completed successfully. ${migrations.length} migrations executed.`,
      migrations: migrations.map(m => m.name)
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Migration error:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: errorMessage
    });
  }
});

/**
 * Check migration status
 * GET /api/migrate/status
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    if (!AppDataSource.isInitialized) {
      res.status(500).json({
        success: false,
        message: 'Database connection not initialized'
      });
      return;
    }

    const executedMigrations = await AppDataSource.query(
      'SELECT * FROM migrations ORDER BY timestamp DESC'
    );
    
    res.status(200).json({
      success: true,
      executedMigrations: executedMigrations
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Migration status error:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Failed to get migration status',
      error: errorMessage
    });
  }
});

export default router;