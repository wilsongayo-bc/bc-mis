#!/usr/bin/env ts-node

/**
 * Production-ready script to ensure all tables are created properly
 * This script can be run in production to initialize the database
 */

import { AppDataSource, initializeDatabase, runMigrations } from '../config/database';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function ensureTables(): Promise<void> {
  console.log('🚀 Starting database table initialization...');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);
  
  try {
    // Initialize database connection
    await initializeDatabase();
    
    // Check current table count
    const tables = await AppDataSource.query('SHOW TABLES');
    console.log(`📊 Current table count: ${tables.length}`);
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found in database');
      
      // Check if we have migrations to run
      try {
        const hasPendingMigrations = await AppDataSource.showMigrations();
        console.log(`📋 Pending migrations status: ${hasPendingMigrations}`);
        
        if (hasPendingMigrations) {
          console.log('🔄 Running migrations...');
          await runMigrations();
        } else {
          console.log('💡 No migrations found, checking synchronization...');
          
          if (AppDataSource.options.synchronize) {
            console.log('🔄 Synchronization is enabled, tables should be created automatically');
            
            // Force a metadata sync by querying entity metadata
            const entityMetadatas = AppDataSource.entityMetadatas;
            console.log(`📋 Found ${entityMetadatas.length} entity definitions:`);
            entityMetadatas.forEach(metadata => {
              console.log(`   - ${metadata.tableName} (${metadata.name})`);
            });
            
            // Trigger synchronization by running a simple query
            await AppDataSource.synchronize();
            console.log('✅ Database synchronization completed');
            
          } else {
            console.log('❌ Synchronization is disabled and no migrations found');
            console.log('💡 Consider enabling FORCE_SYNC=true or creating migrations');
            process.exit(1);
          }
        }
      } catch (migrationError) {
        console.error('❌ Migration check failed:', migrationError);
        
        if (AppDataSource.options.synchronize) {
          console.log('🔄 Falling back to synchronization...');
          await AppDataSource.synchronize();
          console.log('✅ Database synchronization completed');
        } else {
          throw migrationError;
        }
      }
    } else {
      console.log('✅ Tables already exist in database');
      
      // List all tables
      console.log('📋 Existing tables:');
      tables.forEach((table: Record<string, string>) => {
        const tableName = table[Object.keys(table)[0]];
        console.log(`   - ${tableName}`);
      });
    }
    
    // Final verification
    const finalTables = await AppDataSource.query('SHOW TABLES');
    console.log(`🎉 Database initialization completed! Total tables: ${finalTables.length}`);
    
    // Verify all expected entities have tables
    const entityMetadatas = AppDataSource.entityMetadatas;
    const expectedTables = entityMetadatas.map(metadata => metadata.tableName);
    const actualTables = finalTables.map((table: Record<string, string>) => table[Object.keys(table)[0]]);
    
    const missingTables = expectedTables.filter(table => !actualTables.includes(table));
    if (missingTables.length > 0) {
      console.warn('⚠️  Missing tables detected:', missingTables);
    } else {
      console.log('✅ All expected tables are present');
    }
    
  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
if (require.main === module) {
  ensureTables()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { ensureTables };