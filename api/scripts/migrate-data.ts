#!/usr/bin/env tsx

import { DataSource, EntityMetadata, EntityTarget } from 'typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';

// Load environment variables
dotenv.config();

// Import all entities
import { User } from '../entities/User';
import { Student } from '../entities/Student';
import { Employee } from '../entities/Employee';
import { Course } from '../entities/Course';
import { CourseSection } from '../entities/CourseSection';
import { Subject } from '../entities/Subject';
import { SubjectPrerequisite } from '../entities/SubjectPrerequisite';
import { Department } from '../entities/Department';
import { Position } from '../entities/Position';
import { Enrollment } from '../entities/Enrollment';
import { Schedule } from '../entities/Schedule';
import { Payment } from '../entities/Payment';
import { Book } from '../entities/Book';
import { BorrowRecord } from '../entities/BorrowRecord';
import { Settings } from '../entities/Settings';
import { GradeLevel } from '../entities/GradeLevel';

// Define all entities in dependency order (tables with no foreign keys first)
const ENTITIES = [
  User, Department, Position, GradeLevel, Settings,
  Employee, Student, Subject, Book,
  Course, SubjectPrerequisite, CourseSection,
  Enrollment, Schedule, Payment, BorrowRecord
];

interface MigrationOptions {
  source: 'local' | 'remote';
  target: 'local' | 'remote';
  tables?: string[];
  mode: 'full' | 'incremental';
  dryRun: boolean;
  backup: boolean;
  batchSize: number;
  verbose: boolean;
}

interface MigrationStats {
  tablesProcessed: number;
  recordsTransferred: number;
  recordsSkipped: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

class DataMigrator {
  private sourceDataSource: DataSource;
  private targetDataSource: DataSource;
  private stats: MigrationStats;
  private logFile: string;

  constructor(private options: MigrationOptions) {
    this.stats = {
      tablesProcessed: 0,
      recordsTransferred: 0,
      recordsSkipped: 0,
      errors: 0,
      startTime: new Date()
    };
    
    // Create log file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(process.cwd(), 'logs', `migration-${timestamp}.log`);
    
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  private log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;
    
    if (this.options.verbose || level !== 'INFO') {
      console.log(logMessage);
    }
    
    // Write to log file
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  private createDataSource(type: 'local' | 'remote'): DataSource {
    const isLocal = type === 'local';
    
    return new DataSource({
      type: 'mysql',
      host: isLocal ? 'localhost' : process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      username: isLocal ? 'root' : process.env.DB_USERNAME,
      password: isLocal ? 'letmein25' : process.env.DB_PASSWORD,
      database: isLocal ? 'bc_mis' : process.env.DB_DATABASE,
      entities: ENTITIES,
      synchronize: false,
      logging: this.options.verbose,
      extra: {
        connectionLimit: 5,
        acquireTimeout: 15000,
        timeout: 15000,
        connectTimeout: 15000,
        charset: 'utf8mb4',
        timezone: '+00:00',
        ...(type === 'remote' && {
          ssl: {
            rejectUnauthorized: false
          }
        })
      }
    });
  }

  async initialize(): Promise<void> {
    this.log('Initializing data migration...');
    
    try {
      // Create data sources
      this.sourceDataSource = this.createDataSource(this.options.source);
      this.targetDataSource = this.createDataSource(this.options.target);

      // Initialize connections
      this.log(`Connecting to ${this.options.source} database (source)...`);
      await this.sourceDataSource.initialize();
      
      this.log(`Connecting to ${this.options.target} database (target)...`);
      await this.targetDataSource.initialize();
      
      this.log('Database connections established successfully');
    } catch (error) {
      this.log(`Failed to initialize databases: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async createBackup(): Promise<string | null> {
    if (!this.options.backup) return null;

    this.log('Creating backup of target database...');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'backups');
      const backupFile = path.join(backupDir, `backup-${this.options.target}-${timestamp}.json`);
      
      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backup: Record<string, unknown[]> = {};
      
      for (const Entity of ENTITIES) {
        const repository = this.targetDataSource.getRepository(Entity);
        const tableName = repository.metadata.tableName;
        
        try {
          const data = await repository.find();
          backup[tableName] = data;
          this.log(`Backed up ${data.length} records from ${tableName}`);
        } catch (error) {
          this.log(`Failed to backup table ${tableName}: ${error.message}`, 'WARN');
        }
      }
      
      fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
      this.log(`Backup created: ${backupFile}`);
      
      return backupFile;
    } catch (error) {
      this.log(`Backup failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  private getTableDependencies(): string[] {
    // Return table names in dependency order
    return ENTITIES.map(Entity => {
      const metadata = this.sourceDataSource.getMetadata(Entity);
      return metadata.tableName;
    });
  }

  private async getTableData(Entity: EntityTarget<unknown>, lastSync?: Date): Promise<unknown[]> {
    const repository = this.sourceDataSource.getRepository(Entity);
    const metadata = repository.metadata;
    
    if (this.options.mode === 'incremental' && lastSync) {
      // Look for updatedAt or createdAt columns for incremental sync
      const hasUpdatedAt = metadata.columns.some(col => col.propertyName === 'updatedAt');
      const hasCreatedAt = metadata.columns.some(col => col.propertyName === 'createdAt');
      
      if (hasUpdatedAt) {
        return repository.createQueryBuilder()
          .where('updatedAt > :lastSync', { lastSync })
          .getMany();
      } else if (hasCreatedAt) {
        return repository.createQueryBuilder()
          .where('createdAt > :lastSync', { lastSync })
          .getMany();
      }
    }
    
    // Full sync - get all data
    return repository.find();
  }

  private async migrateTable(Entity: EntityTarget<unknown>, lastSync?: Date): Promise<void> {
    const sourceRepo = this.sourceDataSource.getRepository(Entity);
    const targetRepo = this.targetDataSource.getRepository(Entity);
    const tableName = sourceRepo.metadata.tableName;
    
    this.log(`Migrating table: ${tableName}`);
    
    try {
      // Get data from source
      const sourceData = await this.getTableData(Entity, lastSync);
      
      if (sourceData.length === 0) {
        this.log(`No data to migrate for table ${tableName}`);
        return;
      }
      
      this.log(`Found ${sourceData.length} records in ${tableName}`);
      
      if (this.options.dryRun) {
        this.log(`[DRY RUN] Would migrate ${sourceData.length} records to ${tableName}`);
        this.stats.recordsTransferred += sourceData.length;
        return;
      }
      
      // Process in batches
      const batchSize = this.options.batchSize;
      let processed = 0;
      
      for (let i = 0; i < sourceData.length; i += batchSize) {
        const batch = sourceData.slice(i, i + batchSize);
        
        try {
          if (this.options.mode === 'full') {
            // For full sync, use upsert to handle conflicts
            await targetRepo.upsert(batch, {
              conflictPaths: this.getPrimaryKeyColumns(sourceRepo.metadata),
              skipUpdateIfNoValuesChanged: true
            });
          } else {
            // For incremental, insert new records
            await targetRepo.save(batch);
          }
          
          processed += batch.length;
          this.stats.recordsTransferred += batch.length;
          
          if (this.options.verbose) {
            this.log(`Processed ${processed}/${sourceData.length} records for ${tableName}`);
          }
        } catch (error) {
          this.log(`Error processing batch for ${tableName}: ${error.message}`, 'ERROR');
          this.stats.errors++;
          
          // Try individual records in case of batch failure
          for (const record of batch) {
            try {
              if (this.options.mode === 'full') {
                await targetRepo.upsert(record, {
                  conflictPaths: this.getPrimaryKeyColumns(sourceRepo.metadata),
                  skipUpdateIfNoValuesChanged: true
                });
              } else {
                await targetRepo.save(record);
              }
              this.stats.recordsTransferred++;
            } catch (recordError) {
              this.log(`Failed to migrate record in ${tableName}: ${recordError.message}`, 'ERROR');
              this.stats.recordsSkipped++;
            }
          }
        }
      }
      
      this.log(`Successfully migrated ${processed} records to ${tableName}`);
      this.stats.tablesProcessed++;
      
    } catch (error) {
      this.log(`Failed to migrate table ${tableName}: ${error.message}`, 'ERROR');
      this.stats.errors++;
      throw error;
    }
  }

  private getPrimaryKeyColumns(metadata: EntityMetadata): string[] {
    return metadata.primaryColumns.map(col => col.propertyName);
  }

  private getLastSyncTime(): Date | undefined {
    const syncFile = path.join(process.cwd(), '.last-sync');
    
    if (fs.existsSync(syncFile)) {
      const timestamp = fs.readFileSync(syncFile, 'utf8').trim();
      return new Date(timestamp);
    }
    
    return undefined;
  }

  private saveLastSyncTime(): void {
    const syncFile = path.join(process.cwd(), '.last-sync');
    fs.writeFileSync(syncFile, new Date().toISOString());
  }

  async migrate(): Promise<void> {
    this.log('Starting data migration...');
    this.log(`Mode: ${this.options.mode}`);
    this.log(`Source: ${this.options.source}`);
    this.log(`Target: ${this.options.target}`);
    this.log(`Dry run: ${this.options.dryRun}`);
    
    try {
      // Create backup if requested
      const backupFile = await this.createBackup();
      if (backupFile) {
        this.log(`Backup created: ${backupFile}`);
      }
      
      // Get last sync time for incremental migration
      const lastSync = this.options.mode === 'incremental' ? this.getLastSyncTime() : undefined;
      if (lastSync) {
        this.log(`Incremental sync from: ${lastSync.toISOString()}`);
      }
      
      // Get tables to migrate
      const tablesToMigrate = this.options.tables || this.getTableDependencies();
      this.log(`Tables to migrate: ${tablesToMigrate.join(', ')}`);
      
      // Migrate each table in dependency order
      for (const tableName of tablesToMigrate) {
        const Entity = ENTITIES.find(E => {
          const metadata = this.sourceDataSource.getMetadata(E);
          return metadata.tableName === tableName;
        });
        
        if (!Entity) {
          this.log(`Entity not found for table: ${tableName}`, 'WARN');
          continue;
        }
        
        await this.migrateTable(Entity, lastSync);
      }
      
      // Save sync time for incremental migrations
      if (this.options.mode === 'incremental' && !this.options.dryRun) {
        this.saveLastSyncTime();
      }
      
      this.stats.endTime = new Date();
      this.logSummary();
      
    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  private logSummary(): void {
    const duration = this.stats.endTime 
      ? (this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000
      : 0;
    
    this.log('=== Migration Summary ===');
    this.log(`Duration: ${duration.toFixed(2)} seconds`);
    this.log(`Tables processed: ${this.stats.tablesProcessed}`);
    this.log(`Records transferred: ${this.stats.recordsTransferred}`);
    this.log(`Records skipped: ${this.stats.recordsSkipped}`);
    this.log(`Errors: ${this.stats.errors}`);
    this.log(`Log file: ${this.logFile}`);
    this.log('========================');
  }

  async cleanup(): Promise<void> {
    try {
      if (this.sourceDataSource?.isInitialized) {
        await this.sourceDataSource.destroy();
      }
      if (this.targetDataSource?.isInitialized) {
        await this.targetDataSource.destroy();
      }
      this.log('Database connections closed');
    } catch (error) {
      this.log(`Error during cleanup: ${error.message}`, 'ERROR');
    }
  }
}

// CLI Setup
const program = new Command();

program
  .name('migrate-data')
  .description('Migrate data between local and remote MySQL databases')
  .version('1.0.0');

program
  .option('-s, --source <type>', 'Source database (local|remote)', 'local')
  .option('-t, --target <type>', 'Target database (local|remote)', 'remote')
  .option('--tables <tables>', 'Comma-separated list of tables to migrate')
  .option('-m, --mode <mode>', 'Migration mode (full|incremental)', 'full')
  .option('--dry-run', 'Perform a dry run without making changes', false)
  .option('--no-backup', 'Skip backup creation', false)
  .option('-b, --batch-size <size>', 'Batch size for processing records', '100')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .action(async (options) => {
    try {
      const migrationOptions: MigrationOptions = {
        source: options.source as 'local' | 'remote',
        target: options.target as 'local' | 'remote',
        tables: options.tables ? options.tables.split(',').map((t: string) => t.trim()) : undefined,
        mode: options.mode as 'full' | 'incremental',
        dryRun: options.dryRun,
        backup: !options.noBackup,
        batchSize: parseInt(options.batchSize),
        verbose: options.verbose
      };

      // Validate options
      if (migrationOptions.source === migrationOptions.target) {
        console.error('Error: Source and target cannot be the same');
        process.exit(1);
      }

      const migrator = new DataMigrator(migrationOptions);
      
      await migrator.initialize();
      await migrator.migrate();
      await migrator.cleanup();
      
      console.log('Migration completed successfully!');
      process.exit(0);
      
    } catch (error) {
      console.error('Migration failed:', error.message);
      process.exit(1);
    }
  });

// Add preset commands for common scenarios
program
  .command('local-to-remote')
  .description('Migrate all data from local to remote database')
  .option('--dry-run', 'Perform a dry run without making changes', false)
  .option('-v, --verbose', 'Enable verbose logging', false)
  .action(async (options) => {
    const migrationOptions: MigrationOptions = {
      source: 'local',
      target: 'remote',
      mode: 'full',
      dryRun: options.dryRun,
      backup: true,
      batchSize: 100,
      verbose: options.verbose
    };

    const migrator = new DataMigrator(migrationOptions);
    
    try {
      await migrator.initialize();
      await migrator.migrate();
      await migrator.cleanup();
      console.log('Local to remote migration completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error.message);
      await migrator.cleanup();
      process.exit(1);
    }
  });

program
  .command('remote-to-local')
  .description('Migrate all data from remote to local database')
  .option('--dry-run', 'Perform a dry run without making changes', false)
  .option('-v, --verbose', 'Enable verbose logging', false)
  .action(async (options) => {
    const migrationOptions: MigrationOptions = {
      source: 'remote',
      target: 'local',
      mode: 'full',
      dryRun: options.dryRun,
      backup: true,
      batchSize: 100,
      verbose: options.verbose
    };

    const migrator = new DataMigrator(migrationOptions);
    
    try {
      await migrator.initialize();
      await migrator.migrate();
      await migrator.cleanup();
      console.log('Remote to local migration completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error.message);
      await migrator.cleanup();
      process.exit(1);
    }
  });

// Parse command line arguments
if (require.main === module) {
  program.parse();
}

export { DataMigrator, MigrationOptions };