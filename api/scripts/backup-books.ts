#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';
import { DataSource } from 'typeorm';
import { Book } from '../entities/Book';

interface BackupMetadata {
  timestamp: string;
  version: string;
  totalBooks: number;
  backupFormats: string[];
  databaseInfo: {
    host: string;
    database: string;
  };
}

interface BackupReport {
  success: boolean;
  metadata: BackupMetadata;
  files: {
    json: string;
    csv: string;
    sql: string;
    metadata: string;
  };
  errors?: string[];
}

class BookBackupService {
  private dataSource: DataSource | null = null;
  private backupDir: string;
  private timestamp: string;

  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('-')[0];
    this.backupDir = path.join(__dirname, '../../backups/books');
  }

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

  async createBackup(): Promise<BackupReport> {
    const errors: string[] = [];
    const report: BackupReport = {
      success: false,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        totalBooks: 0,
        backupFormats: ['json', 'csv', 'sql'],
        databaseInfo: {
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_DATABASE || 'bc_mis'
        }
      },
      files: {
        json: '',
        csv: '',
        sql: '',
        metadata: ''
      }
    };

    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      // Fetch all books from database
      const bookRepository = this.dataSource!.getRepository(Book);
      const books = await bookRepository.find({
        order: { createdAt: 'ASC' }
      });

      report.metadata.totalBooks = books.length;
      console.log(`📚 Found ${books.length} books to backup`);

      // Generate file paths
      const baseFilename = `books_backup_${this.timestamp}`;
      report.files.json = path.join(this.backupDir, `${baseFilename}.json`);
      report.files.csv = path.join(this.backupDir, `${baseFilename}.csv`);
      report.files.sql = path.join(this.backupDir, `${baseFilename}.sql`);
      report.files.metadata = path.join(this.backupDir, `${baseFilename}_metadata.json`);

      // Create JSON backup
      try {
        await this.createJsonBackup(books, report.files.json);
        console.log('✓ JSON backup created');
      } catch (error) {
        errors.push(`JSON backup failed: ${error}`);
      }

      // Create CSV backup
      try {
        await this.createCsvBackup(books, report.files.csv);
        console.log('✓ CSV backup created');
      } catch (error) {
        errors.push(`CSV backup failed: ${error}`);
      }

      // Create SQL backup
      try {
        await this.createSqlBackup(books, report.files.sql);
        console.log('✓ SQL backup created');
      } catch (error) {
        errors.push(`SQL backup failed: ${error}`);
      }

      // Create metadata file
      try {
        await fs.writeFile(report.files.metadata, JSON.stringify(report.metadata, null, 2));
        console.log('✓ Metadata file created');
      } catch (error) {
        errors.push(`Metadata file failed: ${error}`);
      }

      report.success = errors.length === 0;
      if (errors.length > 0) {
        report.errors = errors;
      }

      return report;

    } catch (error) {
      errors.push(`Backup process failed: ${error}`);
      report.errors = errors;
      return report;
    }
  }

  private async createJsonBackup(books: Book[], filePath: string): Promise<void> {
    const backupData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: books.length,
        format: 'json',
        version: '1.0.0'
      },
      books: books.map(book => ({
        id: book.id,
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        publishedYear: book.publishedYear,
        category: book.category,
        totalCopies: book.totalCopies,
        availableCopies: book.availableCopies,
        location: book.location,
        description: book.description,
        language: book.language,
        pages: book.pages,
        edition: book.edition,
        isActive: book.isActive,
        coverImageUrl: book.coverImageUrl,
        thumbnailUrl: book.thumbnailUrl,
        createdAt: book.createdAt.toISOString(),
        updatedAt: book.updatedAt.toISOString()
      }))
    };

    await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));
  }

  private async createCsvBackup(books: Book[], filePath: string): Promise<void> {
    const headers = [
      'id', 'isbn', 'title', 'author', 'publisher', 'publishedYear', 'category',
      'totalCopies', 'availableCopies', 'location', 'description', 'language',
      'pages', 'edition', 'isActive', 'coverImageUrl', 'thumbnailUrl',
      'createdAt', 'updatedAt'
    ];

    const csvContent = [
      headers.join(','),
      ...books.map(book => [
        this.escapeCsvValue(book.id),
        this.escapeCsvValue(book.isbn),
        this.escapeCsvValue(book.title),
        this.escapeCsvValue(book.author),
        this.escapeCsvValue(book.publisher || ''),
        book.publishedYear || '',
        this.escapeCsvValue(book.category),
        book.totalCopies,
        book.availableCopies,
        this.escapeCsvValue(book.location || ''),
        this.escapeCsvValue(book.description || ''),
        this.escapeCsvValue(book.language || ''),
        book.pages || '',
        this.escapeCsvValue(book.edition || ''),
        book.isActive,
        this.escapeCsvValue(book.coverImageUrl || ''),
        this.escapeCsvValue(book.thumbnailUrl || ''),
        book.createdAt.toISOString(),
        book.updatedAt.toISOString()
      ].join(','))
    ].join('\n');

    await fs.writeFile(filePath, csvContent);
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private async createSqlBackup(books: Book[], filePath: string): Promise<void> {
    const sqlLines = [
      '-- Books Backup SQL File',
      `-- Generated on: ${new Date().toISOString()}`,
      `-- Total records: ${books.length}`,
      '',
      '-- Disable foreign key checks for import',
      'SET FOREIGN_KEY_CHECKS = 0;',
      '',
      '-- Clear existing books (uncomment if needed)',
      '-- DELETE FROM books;',
      '',
      '-- Insert book data',
      ...books.map(book => {
        const values = [
          this.escapeSqlValue(book.id),
          this.escapeSqlValue(book.isbn),
          this.escapeSqlValue(book.title),
          this.escapeSqlValue(book.author),
          book.publisher ? this.escapeSqlValue(book.publisher) : 'NULL',
          book.publishedYear || 'NULL',
          this.escapeSqlValue(book.category),
          book.totalCopies,
          book.availableCopies,
          book.location ? this.escapeSqlValue(book.location) : 'NULL',
          book.description ? this.escapeSqlValue(book.description) : 'NULL',
          book.language ? this.escapeSqlValue(book.language) : 'NULL',
          book.pages || 'NULL',
          book.edition ? this.escapeSqlValue(book.edition) : 'NULL',
          book.isActive ? 1 : 0,
          book.coverImageUrl ? this.escapeSqlValue(book.coverImageUrl) : 'NULL',
          book.thumbnailUrl ? this.escapeSqlValue(book.thumbnailUrl) : 'NULL',
          this.escapeSqlValue(book.createdAt.toISOString().slice(0, 19).replace('T', ' ')),
          this.escapeSqlValue(book.updatedAt.toISOString().slice(0, 19).replace('T', ' '))
        ];

        return `INSERT INTO books (id, isbn, title, author, publisher, publishedYear, category, totalCopies, availableCopies, location, description, language, pages, edition, isActive, coverImageUrl, thumbnailUrl, createdAt, updatedAt) VALUES (${values.join(', ')});`;
      }),
      '',
      '-- Re-enable foreign key checks',
      'SET FOREIGN_KEY_CHECKS = 1;',
      ''
    ];

    await fs.writeFile(filePath, sqlLines.join('\n'));
  }

  private escapeSqlValue(value: string): string {
    return `'${value.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
  }

  async cleanup(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}

// Main execution
async function main() {
  const backupService = new BookBackupService();
  
  try {
    console.log('🔄 Starting book backup process...');
    await backupService.initialize();
    
    const report = await backupService.createBackup();
    
    if (report.success) {
      console.log('\n✅ Backup completed successfully!');
      console.log(`📊 Backed up ${report.metadata.totalBooks} books`);
      console.log('\n📁 Backup files created:');
      console.log(`   JSON: ${path.basename(report.files.json)}`);
      console.log(`   CSV:  ${path.basename(report.files.csv)}`);
      console.log(`   SQL:  ${path.basename(report.files.sql)}`);
      console.log(`   Meta: ${path.basename(report.files.metadata)}`);
      console.log(`\n📂 Location: ${path.dirname(report.files.json)}`);
    } else {
      console.log('\n❌ Backup completed with errors:');
      report.errors?.forEach(error => console.log(`   - ${error}`));
    }
    
  } catch (error) {
    console.error('\n💥 Backup failed:', error);
    process.exit(1);
  } finally {
    await backupService.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { BookBackupService };