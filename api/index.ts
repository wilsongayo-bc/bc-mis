import 'reflect-metadata';
import app from './app';
import { initializeDatabase } from './config/database';
import { Request, Response, NextFunction } from 'express';

// Initialize database connection synchronously for serverless
let databaseInitialized = false;

const initDatabase = async () => {
  if (databaseInitialized) {
    return;
  }
  
  try {
    await initializeDatabase();
    databaseInitialized = true;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

// Middleware to ensure database is initialized before each request
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!databaseInitialized) {
      await initDatabase();
    }
    next();
  } catch (error) {
    console.error('Database middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// All endpoints are now handled by the imported app.ts file

module.exports = app;
module.exports.default = app;