/**
 * New Vercel deploy entry handler to bypass cache
 * Created: 2025-01-27
 * Updated: 2025-01-27 - Force cache invalidation v6
 */
import 'reflect-metadata';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeDatabase } from './config/database';
import app from './app';

let isInitialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Initialize database once for serverless functions
  if (!isInitialized && process.env.NODE_ENV === 'production') {
    try {
      await initializeDatabase();
      isInitialized = true;
      console.log('✅ Database initialized successfully in production - v6-cache-fix');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      console.error('Database config:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        database: process.env.DB_DATABASE,
        hasPassword: !!process.env.DB_PASSWORD
      });
      // Let the app handle the error instead of returning early
    }
  }
  
  return app(req, res);
}