import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initMigrationTracking() {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connection established');
    
    // Check if migrations table exists
    const queryRunner = AppDataSource.createQueryRunner();
    const hasMigrationsTable = await queryRunner.hasTable('migrations');
    
    if (!hasMigrationsTable) {
      console.log('📋 Creating migrations table...');
      await queryRunner.query(`
        CREATE TABLE migrations (
          id int NOT NULL AUTO_INCREMENT,
          timestamp bigint NOT NULL,
          name varchar(255) NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      console.log('✅ Migrations table created');
    } else {
      console.log('📋 Migrations table already exists');
    }
    
    // Check if migrations table is empty
    const existingMigrations = await queryRunner.query('SELECT COUNT(*) as count FROM migrations');
    const migrationCount = existingMigrations[0].count;
    
    console.log(`📊 Current migration records: ${migrationCount}`);
    
    if (migrationCount === 0) {
      console.log('🔄 Marking existing migrations as completed...');
      
      // Get all migration files
      const migrationsDir = path.join(__dirname, '../migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.ts') && !file.includes('create-reports-tables'))
        .sort();
      
      console.log(`📋 Found ${migrationFiles.length} migration files to mark as completed`);
      
      // Insert migration records
      for (const file of migrationFiles) {
        const timestamp = extractTimestamp(file);
        const name = file.replace('.ts', '');
        
        if (timestamp) {
          await queryRunner.query(
            'INSERT INTO migrations (timestamp, name) VALUES (?, ?)',
            [timestamp, name]
          );
          console.log(`✅ Marked migration as completed: ${name}`);
        }
      }
      
      console.log('✅ All existing migrations marked as completed');
    } else {
      console.log('ℹ️  Migration tracking already initialized');
    }
    
    await queryRunner.release();
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration tracking initialization failed:', error);
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

initMigrationTracking();