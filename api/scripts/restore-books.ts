#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';
import { DataSource } from 'typeorm';
import { Book } from '../entities/Book';
import { Command } from 'commander';

interface RestoreOptions {
  file: string;
  format: 'json' | 'csv' | 'sql';
  clearExisting: boolean;
  dryRun: boolean;
  skipDuplicates: boolean;
}

interface RestoreReport {
  success: boolean;
  totalRecords: number;
  imported: number;
  skipped: number;
  errors: string[];
  duplicates: string[];
}

class BookRestoreService {
  private dataSource: DataSource | null = null;

  async initialize(): Promise<void> {
    try {
      // Import database configuration
      const { AppDataSource } = await import('../config/database');
      this.dataSource = AppDataSource;
      
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }
      
      console.log('✓ Database connection established');
    } catch (error) {
      console.error('✗ Failed to connect to database:', error);
      throw error;
    }
  }

  async restoreFromFile(options: RestoreOptions): Promise<RestoreReport> {
    const report: RestoreReport = {
      success: false,
      totalRecords: 0,
      imported: 0,
      skipped: 0,
      errors: [],
      duplicates: []
    };

    try {
      // Check if file exists
      await fs.access(options.file);
      
      // Parse the backup file based on format
      let books: Record<string, unknown>[] = [];
      
      switch (options.format) {
        case 'json':
          books = await this.parseJsonBackup(options.file);
          break;
        case 'csv':
          books = await this.parseCsvBackup(options.file);
          break;
        case 'sql':
          throw new Error('SQL restore not implemented yet. Use JSON or CSV format.');
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      report.totalRecords = books.length;
      console.log(`📚 Found ${books.length} books in backup file`);

      if (options.dryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made to database');
        report.imported = books.length;
        report.success = true;
        return report;
      }

      // Clear existing books if requested
      if (options.clearExisting) {
        await this.clearExistingBooks();
        console.log('🗑️  Cleared existing books from database');
      }

      // Get existing ISBNs to check for duplicates
      const bookRepository = this.dataSource!.getRepository(Book);
      const existingBooks = await bookRepository.find({ select: ['isbn'] });
      const existingIsbns = new Set(existingBooks.map(book => book.isbn));

      // Import books
      for (const bookData of books) {
        try {
          const isbn = bookData.isbn as string;
          // Check for duplicates
          if (existingIsbns.has(isbn)) {
            if (options.skipDuplicates) {
              report.duplicates.push(isbn);
              report.skipped++;
              continue;
            } else {
              // Update existing book
              await bookRepository.update({ isbn }, this.sanitizeBookData(bookData));
              report.imported++;
            }
          } else {
            // Create new book
            const book = bookRepository.create(this.sanitizeBookData(bookData));
            await bookRepository.save(book);
            existingIsbns.add(isbn);
            report.imported++;
          }
        } catch (error) {
          const isbn = bookData.isbn as string;
          report.errors.push(`Failed to import book ${isbn}: ${error}`);
        }
      }

      report.success = report.errors.length === 0;
      return report;

    } catch (error) {
      report.errors.push(`Restore process failed: ${error}`);
      return report;
    }
  }

  private async parseJsonBackup(filePath: string): Promise<Record<string, unknown>[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Handle both direct array and wrapped format
    if (Array.isArray(data)) {
      return data;
    } else if (data.books && Array.isArray(data.books)) {
      return data.books;
    } else {
      throw new Error('Invalid JSON backup format');
    }
  }

  private async parseCsvBackup(filePath: string): Promise<Record<string, unknown>[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const books: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length !== headers.length) {
        console.warn(`Skipping malformed CSV line ${i + 1}`);
        continue;
      }

      const book: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        const value = values[index];
        
        // Convert specific fields to appropriate types
        switch (header) {
          case 'publishedYear':
          case 'totalCopies':
          case 'availableCopies':
          case 'pages':
            book[header] = value && value !== '' ? parseInt(value) : null;
            break;
          case 'isActive':
            book[header] = value === 'true' || value === '1';
            break;
          case 'createdAt':
          case 'updatedAt':
            book[header] = value ? new Date(value) : new Date();
            break;
          default:
            book[header] = value === '' ? null : value;
        }
      });

      books.push(book);
    }

    return books;
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    values.push(current);
    return values;
  }

  private sanitizeBookData(bookData: Record<string, unknown>): Partial<Book> {
    return {
      id: bookData.id as string,
      isbn: bookData.isbn as string,
      title: bookData.title as string,
      author: bookData.author as string,
      publisher: (bookData.publisher as string) || null,
      publishedYear: (bookData.publishedYear as number) || null,
      category: bookData.category as string,
      totalCopies: (bookData.totalCopies as number) || 1,
      availableCopies: (bookData.availableCopies as number) || 1,
      location: (bookData.location as string) || null,
      description: (bookData.description as string) || null,
      language: (bookData.language as string) || 'English',
      pages: (bookData.pages as number) || null,
      edition: (bookData.edition as string) || null,
      isActive: bookData.isActive !== false,
      coverImageUrl: (bookData.coverImageUrl as string) || null,
      thumbnailUrl: (bookData.thumbnailUrl as string) || null,
      createdAt: bookData.createdAt ? new Date(bookData.createdAt as string | number | Date) : new Date(),
      updatedAt: bookData.updatedAt ? new Date(bookData.updatedAt as string | number | Date) : new Date()
    };
  }

  private async clearExistingBooks(): Promise<void> {
    const bookRepository = this.dataSource!.getRepository(Book);
    await bookRepository.delete({});
  }

  async listBackupFiles(): Promise<string[]> {
    const backupDir = path.join(__dirname, '../../backups/books');
    
    try {
      const files = await fs.readdir(backupDir);
      return files.filter(file => 
        file.endsWith('.json') || 
        file.endsWith('.csv') || 
        file.endsWith('.sql')
      ).sort().reverse(); // Most recent first
    } catch (_error) {
      return [];
    }
  }

  async cleanup(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}

// CLI Interface
async function main() {
  const program = new Command();
  
  program
    .name('restore-books')
    .description('Restore books from backup files')
    .version('1.0.0');

  program
    .option('-f, --file <path>', 'backup file path')
    .option('-t, --format <type>', 'backup format (json|csv|sql)', 'json')
    .option('-c, --clear', 'clear existing books before restore', false)
    .option('-d, --dry-run', 'preview restore without making changes', false)
    .option('-s, --skip-duplicates', 'skip duplicate ISBNs instead of updating', false)
    .option('-l, --list', 'list available backup files', false);

  program.parse();
  const options = program.opts();

  const restoreService = new BookRestoreService();

  try {
    await restoreService.initialize();

    // List backup files if requested
    if (options.list) {
      console.log('📁 Available backup files:');
      const files = await restoreService.listBackupFiles();
      if (files.length === 0) {
        console.log('   No backup files found');
      } else {
        files.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file}`);
        });
      }
      return;
    }

    // Validate required options
    if (!options.file) {
      console.error('❌ Error: --file option is required');
      process.exit(1);
    }

    // Resolve file path
    let filePath = options.file;
    if (!path.isAbsolute(filePath)) {
      // Try relative to backup directory first
      const backupDir = path.join(__dirname, '../../backups/books');
      const backupFilePath = path.join(backupDir, filePath);
      
      try {
        await fs.access(backupFilePath);
        filePath = backupFilePath;
      } catch {
        // Try relative to current directory
        filePath = path.resolve(filePath);
      }
    }

    console.log('🔄 Starting book restore process...');
    console.log(`📁 File: ${filePath}`);
    console.log(`📋 Format: ${options.format}`);
    
    if (options.dryRun) {
      console.log('🔍 Mode: DRY RUN');
    }
    if (options.clear) {
      console.log('🗑️  Will clear existing books');
    }

    const restoreOptions: RestoreOptions = {
      file: filePath,
      format: options.format,
      clearExisting: options.clear,
      dryRun: options.dryRun,
      skipDuplicates: options.skipDuplicates
    };

    const report = await restoreService.restoreFromFile(restoreOptions);

    if (report.success) {
      console.log('\n✅ Restore completed successfully!');
      console.log(`📊 Total records: ${report.totalRecords}`);
      console.log(`✅ Imported: ${report.imported}`);
      console.log(`⏭️  Skipped: ${report.skipped}`);
      
      if (report.duplicates.length > 0) {
        console.log(`🔄 Duplicates handled: ${report.duplicates.length}`);
      }
    } else {
      console.log('\n❌ Restore completed with errors:');
      report.errors.forEach(error => console.log(`   - ${error}`));
    }

  } catch (error) {
    console.error('\n💥 Restore failed:', error);
    process.exit(1);
  } finally {
    await restoreService.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { BookRestoreService };