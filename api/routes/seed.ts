import { Router, Request, Response } from 'express';
import { DataSeeder } from '../utils/dataSeeder';
import { AppDataSource } from '../config/database';

const router = Router();

/**
 * POST /api/seed/run
 * Runs the comprehensive seed data script
 * Requires authentication and special seed key for security
 */
router.post('/run', async (req: Request, res: Response) => {
  try {
    // Security check - require a special seed key
    const seedKey = req.headers['x-seed-key'] || req.body.seedKey;
    const expectedSeedKey = process.env.SEED_KEY || 'seed-key-100420250849';
    
    if (!seedKey || seedKey !== expectedSeedKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing seed key'
      });
    }

    // Initialize database connection if not already connected
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Run the seed data
    const seeder = new DataSeeder();
    const result = await seeder.runAllSeeds();

    res.json({
      success: true,
      message: 'Seed data executed successfully',
      data: result
    });

  } catch (error) {
    console.error('Seed data execution failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute seed data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/seed/status
 * Check if seed data can be run (database connection status)
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const isConnected = AppDataSource.isInitialized;
    
    res.json({
      success: true,
      database_connected: isConnected,
      message: isConnected ? 'Database is connected' : 'Database is not connected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check database status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;