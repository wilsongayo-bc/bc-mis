import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function populateMigrationTracking() {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connection established');
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.ts'))
      .sort();
    
    console.log(`📋 Found ${migrationFiles.length} migration files to mark as completed`);
    
    // Insert migration records
    for (const file of migrationFiles) {
      const timestamp = extractTimestamp(file);
      const name = file.replace('.ts', '');
      
      if (timestamp) {
        try {
          await queryRunner.query(
            'INSERT INTO migrations (timestamp, name) VALUES (?, ?)',
            [timestamp, name]
          );
          console.log(`✅ Marked migration as completed: ${name}`);
        } catch (_error) {
          console.log(`⚠️  Migration already exists: ${name}`);
        }
      } else {
        console.log(`⚠️  Could not extract timestamp from: ${file}`);
      }
    }
    
    // Check final count
    const result = await queryRunner.query('SELECT COUNT(*) as count FROM migrations');
    console.log(`📊 Total migration records: ${result[0].count}`);
    
    await queryRunner.release();
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration tracking population failed:', error);
    process.exit(1);
  }
}

function extractTimestamp(filename: string): number | null {
  // Extract timestamp from migration filename
  const match = filename.match(/^(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  
  // For files like "001_initial_schema.ts", use a base timestamp
  const orderMatch = filename.match(/^(\d{3})_/);
  if (orderMatch) {
    return 1700000000000 + parseInt(orderMatch[1]); // Base timestamp + order
  }
  
  return null;
}

populateMigrationTracking();