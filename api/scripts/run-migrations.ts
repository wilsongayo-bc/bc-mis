// Dweezil's Code - Load environment variables from parent directory
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from api directory first, then parent directory as fallback
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { AppDataSource } from '../config/database';

// Ensure we don't sync schema, only run migrations
process.env.NODE_ENV = 'production';

async function runMigrations() {
  try {
    console.log('Starting migration script...');
    
    // Debug: Check migrations directory
    const migrationsDir = path.resolve(__dirname, '../migrations');
    console.log('Looking for migrations in:', migrationsDir);
    
    if (fs.existsSync(migrationsDir)) {
        const files = fs.readdirSync(migrationsDir);
        console.log(`Found ${files.length} files in migrations directory.`);
        // Log first few and last few files to verify
        if (files.length > 0) {
            console.log('First 3 files:', files.slice(0, 3));
            console.log('Last 3 files:', files.slice(-3));
        }
        
        // Check specifically for the new migration
        const newMigration = files.find(f => f.includes('CreateReportsTables'));
        if (newMigration) {
            console.log('Found CreateReportsTables migration:', newMigration);
        } else {
            console.log('WARNING: CreateReportsTables migration NOT found in directory!');
        }
    } else {
        console.error('ERROR: Migrations directory does not exist!');
    }

    console.log('Connecting to database for migrations...');
    console.log('Database config:', {
      host: AppDataSource.options.type === 'mysql' ? (AppDataSource.options as { host: string }).host : 'N/A',
      port: AppDataSource.options.type === 'mysql' ? (AppDataSource.options as { port: number }).port : 'N/A',
      database: AppDataSource.options.type === 'mysql' ? (AppDataSource.options as { database: string }).database : 'N/A',
    });
    
    // Force synchronize to false just in case
    if (AppDataSource.options.synchronize) {
        Object.assign(AppDataSource.options, { synchronize: false });
    }
    
    // Log the migration pattern being used
    console.log('DataSource migration patterns:', AppDataSource.options.migrations);

    // Set a connection timeout
    const timeout = setTimeout(() => {
      console.error('❌ Database connection timeout after 10 seconds');
      console.error('Please ensure MySQL is running and accessible');
      process.exit(1);
    }, 10000);

    await AppDataSource.initialize();
    clearTimeout(timeout);
    console.log('Database connected.');

    console.log('Running migrations...');
    const migrations = await AppDataSource.runMigrations();
    console.log(`Executed ${migrations.length} migrations.`);
    
    for (const migration of migrations) {
        console.log(`- ${migration.name}`);
    }

    await AppDataSource.destroy();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall
    });
    process.exit(1);
  }
}

runMigrations();
