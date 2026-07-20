#!/usr/bin/env node

/**
 * Document Data Migration Script
 * Migrates document categories and requirements from local to remote database
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Simple interfaces for data transfer (avoiding complex entity relationships)
interface CategoryData {
  id: number;
  name: string;
  description?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RequirementData {
  id: number;
  name: string;
  description?: string;
  isRequired: boolean;
  categoryId: number;
  validationRules?: string;
  applicableGradeLevels?: string;
  expirationDays?: number;
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MigrationStats {
  categoriesProcessed: number;
  categoriesTransferred: number;
  categoriesSkipped: number;
  requirementsProcessed: number;
  requirementsTransferred: number;
  requirementsSkipped: number;
  errors: string[];
}

class DocumentDataMigrator {
  private localDataSource: DataSource;
  private remoteDataSource: DataSource;
  private logFile: string;
  private isDryRun: boolean;
  private isVerbose: boolean;

  constructor(isDryRun: boolean = false, isVerbose: boolean = false) {
    this.isDryRun = isDryRun;
    this.isVerbose = isVerbose;
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    this.logFile = path.join(logsDir, `document-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

    // Local database configuration
    this.localDataSource = new DataSource({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'letmein25',
      database: 'bc_mis',
      entities: [], // We'll use raw queries
      synchronize: false,
      logging: false,
    });

    // Remote database configuration
    this.remoteDataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST || '153.92.15.31',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'u875409848_bc_mis',
      password: process.env.DB_PASSWORD || '$SbdBlX8y',
      database: process.env.DB_DATABASE || 'u875409848_bc_mis',
      entities: [], // We'll use raw queries
      synchronize: false,
      logging: false,
    });
  }

  private log(message: string, level: 'INFO' | 'ERROR' | 'WARN' = 'INFO'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;
    
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  private async initialize(): Promise<void> {
    try {
      this.log('Initializing database connections...');
      
      await this.localDataSource.initialize();
      this.log('Local database connection established');
      
      await this.remoteDataSource.initialize();
      this.log('Remote database connection established');
      
    } catch (error) {
      this.log(`Failed to initialize database connections: ${error}`, 'ERROR');
      throw new Error(`Failed to initialize database connections: ${error}`);
    }
  }

  private async createBackup(): Promise<void> {
    if (this.isDryRun) {
      this.log('Skipping backup creation (dry run mode)');
      return;
    }

    try {
      this.log('Creating backup of remote data...');
      
      const categories = await this.remoteDataSource.query('SELECT * FROM document_categories');
      const requirements = await this.remoteDataSource.query('SELECT * FROM document_requirements');
      
      const backupData = {
        timestamp: new Date().toISOString(),
        categories,
        requirements
      };
      
      const backupFile = path.join(__dirname, '../logs', `document-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      
      this.log(`Backup created: ${backupFile}`);
    } catch (error) {
      this.log(`Failed to create backup: ${error}`, 'ERROR');
      throw error;
    }
  }

  private async migrateCategories(): Promise<{ processed: number; transferred: number; skipped: number }> {
    this.log('Starting category migration...');
    
    const localCategories: CategoryData[] = await this.localDataSource.query(`
       SELECT id, name, description, color, sort_order as sortOrder, is_active as isActive, created_at as createdAt, updated_at as updatedAt 
       FROM document_categories 
       ORDER BY sort_order, id
     `);
    
    const remoteCategories: CategoryData[] = await this.remoteDataSource.query(`
       SELECT id, name, description, color, sort_order as sortOrder, is_active as isActive, created_at as createdAt, updated_at as updatedAt 
       FROM document_categories
     `);
    
    const remoteCategoryNames = new Set(remoteCategories.map(c => c.name.toLowerCase()));
    
    let processed = 0;
    let transferred = 0;
    const skipped = 0;
    
    for (const category of localCategories) {
      processed++;
      
      if (this.isVerbose) {
        this.log(`Processing category: ${category.name}`);
      }
      
      if (remoteCategoryNames.has(category.name.toLowerCase())) {
        this.log(`Category already exists, updating: ${category.name}`);
        
        if (!this.isDryRun) {
           await this.remoteDataSource.query(`
             UPDATE document_categories 
             SET description = ?, color = ?, sort_order = ?, is_active = ?, updated_at = NOW()
             WHERE LOWER(name) = LOWER(?)
           `, [category.description, category.color, category.sortOrder, category.isActive, category.name]);
         }
        
        transferred++;
      } else {
        this.log(`Creating new category: ${category.name}`);
        
        if (!this.isDryRun) {
           const newId = uuidv4();
           await this.remoteDataSource.query(`
             INSERT INTO document_categories (id, name, description, color, sort_order, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           `, [newId, category.name, category.description, category.color, category.sortOrder, category.isActive, category.createdAt, category.updatedAt]);
         }
        
        transferred++;
      }
    }
    
    this.log(`Category migration completed: ${processed} processed, ${transferred} transferred, ${skipped} skipped`);
    return { processed, transferred, skipped };
  }

  private async migrateRequirements(): Promise<{ processed: number; transferred: number; skipped: number }> {
    this.log('Starting requirement migration...');
    
    // Get category mapping (local ID -> remote ID)
    const localCategories: CategoryData[] = await this.localDataSource.query(`
      SELECT id, name FROM document_categories ORDER BY id
    `);
    
    const remoteCategories: CategoryData[] = await this.remoteDataSource.query(`
      SELECT id, name FROM document_categories ORDER BY id
    `);
    
    const categoryMapping = new Map<number, number>();
    for (const localCat of localCategories) {
      const remoteCat = remoteCategories.find(r => r.name.toLowerCase() === localCat.name.toLowerCase());
      if (remoteCat) {
        categoryMapping.set(localCat.id, remoteCat.id);
      }
    }
    
    const localRequirements: RequirementData[] = await this.localDataSource.query(`
       SELECT id, name, description, is_required as isRequired, category_id as categoryId, validation_rules as validationRules, 
              applicable_grade_levels as applicableGradeLevels, expiration_days as expirationDays, created_by as createdBy, created_at as createdAt, updated_at as updatedAt 
       FROM document_requirements 
       ORDER BY category_id, id
     `);
    
    const remoteRequirements: RequirementData[] = await this.remoteDataSource.query(`
       SELECT id, name, description, is_required as isRequired, category_id as categoryId, validation_rules as validationRules, 
              applicable_grade_levels as applicableGradeLevels, expiration_days as expirationDays, created_by as createdBy, created_at as createdAt, updated_at as updatedAt 
       FROM document_requirements
     `);
    
    const remoteRequirementNames = new Set(remoteRequirements.map(r => r.name.toLowerCase()));
    
    let processed = 0;
    let transferred = 0;
    let skipped = 0;
    
    for (const requirement of localRequirements) {
      processed++;
      
      if (this.isVerbose) {
        this.log(`Processing requirement: ${requirement.name}`);
      }
      
      const remoteCategoryId = categoryMapping.get(requirement.categoryId);
      if (!remoteCategoryId) {
        this.log(`Skipping requirement ${requirement.name}: category not found in remote database`, 'WARN');
        skipped++;
        continue;
      }
      
      if (remoteRequirementNames.has(requirement.name.toLowerCase())) {
        this.log(`Requirement already exists, updating: ${requirement.name}`);
        
        if (!this.isDryRun) {
           await this.remoteDataSource.query(`
             UPDATE document_requirements 
             SET description = ?, is_required = ?, category_id = ?, validation_rules = ?, 
                 applicable_grade_levels = ?, expiration_days = ?, updated_at = NOW()
             WHERE LOWER(name) = LOWER(?)
           `, [requirement.description, requirement.isRequired, remoteCategoryId, 
               requirement.validationRules, requirement.applicableGradeLevels, 
               requirement.expirationDays, requirement.name]);
         }
        
        transferred++;
      } else {
        this.log(`Creating new requirement: ${requirement.name}`);
        
        if (!this.isDryRun) {
           const newId = uuidv4();
           const insertValues = [
          newId, requirement.name, requirement.description, requirement.isRequired,
          remoteCategoryId, 
          requirement.validationRules ? JSON.stringify(requirement.validationRules) : null,
          requirement.applicableGradeLevels ? JSON.stringify(requirement.applicableGradeLevels) : null, 
          requirement.expirationDays,
          requirement.createdBy, requirement.createdAt, requirement.updatedAt
        ];
           
           if (this.isVerbose) {
             this.log(`Executing INSERT with values: ${JSON.stringify(insertValues)}`);
           }
           
           await this.remoteDataSource.query(`
             INSERT INTO document_requirements (id, name, description, is_required, category_id, 
                                              validation_rules, applicable_grade_levels, expiration_days, 
                                              created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           `, insertValues);
         }
        
        transferred++;
      }
    }
    
    this.log(`Requirement migration completed: ${processed} processed, ${transferred} transferred, ${skipped} skipped`);
    return { processed, transferred, skipped };
  }

  async migrate(): Promise<MigrationStats> {
    const stats: MigrationStats = {
      categoriesProcessed: 0,
      categoriesTransferred: 0,
      categoriesSkipped: 0,
      requirementsProcessed: 0,
      requirementsTransferred: 0,
      requirementsSkipped: 0,
      errors: []
    };

    try {
      await this.initialize();
      await this.createBackup();

      // Migrate categories first
      const categoryStats = await this.migrateCategories();
      stats.categoriesProcessed = categoryStats.processed;
      stats.categoriesTransferred = categoryStats.transferred;
      stats.categoriesSkipped = categoryStats.skipped;

      // Then migrate requirements
      const requirementStats = await this.migrateRequirements();
      stats.requirementsProcessed = requirementStats.processed;
      stats.requirementsTransferred = requirementStats.transferred;
      stats.requirementsSkipped = requirementStats.skipped;

      this.log('Migration completed successfully!');
      
    } catch (error) {
      const errorMessage = `Migration failed: ${error}`;
      this.log(errorMessage, 'ERROR');
      stats.errors.push(errorMessage);
      throw new Error(errorMessage);
    } finally {
      await this.cleanup();
    }

    return stats;
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.localDataSource.isInitialized) {
        await this.localDataSource.destroy();
        this.log('Local database connection closed');
      }
      
      if (this.remoteDataSource.isInitialized) {
        await this.remoteDataSource.destroy();
        this.log('Remote database connection closed');
      }
    } catch (error) {
      this.log(`Error during cleanup: ${error}`, 'ERROR');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isVerbose = args.includes('--verbose');
  
  console.log(`🚀 Document Data Migration Tool`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
  console.log(`Verbose: ${isVerbose ? 'ON' : 'OFF'}`);
  console.log('');

  const migrator = new DocumentDataMigrator(isDryRun, isVerbose);
  
  try {
    const stats = await migrator.migrate();
    
    console.log('\n✅ Migration Summary:');
    console.log(`Categories: ${stats.categoriesTransferred}/${stats.categoriesProcessed} transferred`);
    console.log(`Requirements: ${stats.requirementsTransferred}/${stats.requirementsProcessed} transferred`);
    
    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      stats.errors.forEach(error => console.log(`  - ${error}`));
    }
    
  } catch (error) {
    console.error(`\n❌ Migration failed: ${error}`);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}