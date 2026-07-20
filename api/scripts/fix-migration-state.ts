import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixMigrationState() {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connection established');
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    // Ensure migrations table exists
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
    }

    // CLEAR existing migration records to start fresh (and fix my previous bad inserts)
    console.log('🧹 Clearing migrations table...');
    await queryRunner.query('DELETE FROM migrations');

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.ts'))
      .sort();
    
    console.log(`📋 Found ${migrationFiles.length} migration files.`);
    
    // EXCLUDE the new migration
    // const targetMigration = '007_add_prerequisite_category.ts';
    // const filesToMark = migrationFiles.filter(file => file !== targetMigration);
    
    // INCLUDE ALL migrations (since the column already exists)
    const filesToMark = migrationFiles;
    
    console.log(`Starting to mark ${filesToMark.length} migrations as done...`);

    for (const file of filesToMark) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      let migrationName: string | null = null;
      let timestamp: number | null = null;

      // 1. Try to find name = '...'
      const nameMatch = content.match(/name\s*=\s*['"]([^'"]+)['"]/);
      if (nameMatch) {
          migrationName = nameMatch[1];
          // Extract timestamp from the end of the name
          const tsMatch = migrationName.match(/(\d+)$/);
          if (tsMatch) {
              timestamp = parseInt(tsMatch[1]);
          }
          console.log(`   Found explicit name: ${migrationName}`);
      }

      // 2. Fallback to class name
      if (!migrationName) {
          const classMatch = content.match(/export\s+class\s+(\w+)\s+implements/);
          if (classMatch) {
              migrationName = classMatch[1];
              const tsMatch = migrationName.match(/(\d+)$/);
              if (tsMatch) {
                  timestamp = parseInt(tsMatch[1]);
              }
              console.log(`   Found class name: ${migrationName}`);
          }
      }

      // 3. Last resort: filename timestamp
      if (!timestamp) {
           const match = file.match(/^(\d+)/);
           if (match) {
             timestamp = parseInt(match[1]);
           } else {
             const orderMatch = file.match(/^(\d{3})_/);
             if (orderMatch) {
                timestamp = 1000000000000 + parseInt(orderMatch[1]); 
             }
           }
      }

      if (migrationName && timestamp) {
        await queryRunner.query(
            'INSERT INTO migrations (timestamp, name) VALUES (?, ?)',
            [timestamp, migrationName]
        );
        console.log(`✅ MARKED AS DONE: ${migrationName} (ts: ${timestamp})`);
      } else {
        console.log(`⚠️  SKIPPING: Could not determine name/timestamp for: ${file}`);
      }
    }
    
    console.log('---------------------------------------------------');
    console.log('✅ MIGRATION STATE FIXED SUCCESSFULLY');
    console.log('---------------------------------------------------');
    console.log(`👉 NOW run this command to apply the NEW changes:`);
    console.log(`   npm run migrate`);
    
    await queryRunner.release();
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

fixMigrationState();