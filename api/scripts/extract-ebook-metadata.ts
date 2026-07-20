#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';
import { DataSource } from 'typeorm';
import { Book } from '../entities/Book';

// PDF parsing libraries
import pdf from 'pdf-parse';

// Command line argument parsing
import { Command } from 'commander';

// Optional CLI dependencies for development environment
interface ChalkInterface {
  green: (text: string) => string;
  red: (text: string) => string;
  yellow: (text: string) => string;
  blue: (text: string) => string;
  cyan: (text: string) => string;
  magenta: (text: string) => string;
  gray: (text: string) => string;
  bold: (text: string) => string;
}

interface ProgressBarInterface {
  start: (total: number, startValue: number) => void;
  update: (current: number, payload?: Record<string, unknown>) => void;
  stop: () => void;
}

interface CliProgressInterface {
  SingleBar: new (options?: Record<string, unknown>) => ProgressBarInterface;
  Presets: {
    shades_classic: Record<string, unknown>;
  };
}

let chalk: ChalkInterface;
let cliProgress: CliProgressInterface;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  chalk = require('chalk');
} catch (_e) {
  // Fallback for environments without chalk
  chalk = {
    green: (text: string) => text,
    red: (text: string) => text,
    yellow: (text: string) => text,
    blue: (text: string) => text,
    cyan: (text: string) => text,
    magenta: (text: string) => text,
    gray: (text: string) => text,
    bold: (text: string) => text,
  };
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cliProgress = require('cli-progress');
} catch (_e) {
  // Fallback for environments without cli-progress
  cliProgress = {
    SingleBar: class {
      constructor(_options?: Record<string, unknown>) {}
      start(_total: number, _startValue: number) {}
      update(_current: number, _payload?: Record<string, unknown>) {}
      stop() {}
    },
    Presets: {
      shades_classic: {}
    }
  };
}

interface ExtractedMetadata {
  title: string;
  author: string;
  publisher?: string;
  publishedYear?: number;
  pages?: number;
  language?: string;
  description?: string;
  isbn?: string;
  category?: string;
  edition?: string;
}

interface CategoryMapping {
  [keyword: string]: string;
}

class EbookExtractor {
  private dataSource: DataSource | null = null;
  private categoryMapping: CategoryMapping = {};
  private progressBar: ProgressBarInterface | null = null;

  constructor(
    private ebooksPath: string,
    private dryRun: boolean = false,
    private verbose: boolean = false,
    private skipExisting: boolean = true
  ) {}

  async initialize(): Promise<void> {
    // Load category mapping
    await this.loadCategoryMapping();

    // Initialize database connection
    if (!this.dryRun) {
      await this.initializeDatabase();
    }
  }

  private async loadCategoryMapping(): Promise<void> {
    try {
      const mappingPath = path.join(__dirname, 'category-mapping.json');
      const mappingData = await fs.readFile(mappingPath, 'utf-8');
      this.categoryMapping = JSON.parse(mappingData);
      
      if (this.verbose) {
        console.log(chalk.blue(`📂 Loaded category mapping with ${Object.keys(this.categoryMapping).length} entries`));
      }
    } catch {
      if (this.verbose) {
        console.log(chalk.yellow('⚠️  No category mapping file found, using defaults'));
      }
      this.categoryMapping = this.getDefaultCategoryMapping();
    }
  }

  private getDefaultCategoryMapping(): CategoryMapping {
    return {
      'fiction': 'Fiction',
      'novel': 'Fiction',
      'story': 'Fiction',
      'romance': 'Romance',
      'mystery': 'Mystery',
      'thriller': 'Thriller',
      'science': 'Science',
      'technology': 'Technology',
      'computer': 'Technology',
      'programming': 'Technology',
      'history': 'History',
      'biography': 'Biography',
      'autobiography': 'Biography',
      'business': 'Business',
      'management': 'Business',
      'economics': 'Economics',
      'psychology': 'Psychology',
      'philosophy': 'Philosophy',
      'religion': 'Religion',
      'health': 'Health',
      'medicine': 'Medicine',
      'education': 'Education',
      'children': 'Children',
      'young adult': 'Young Adult',
      'cookbook': 'Cooking',
      'travel': 'Travel',
      'art': 'Art',
      'music': 'Music',
      'sports': 'Sports',
      'reference': 'Reference',
      'textbook': 'Academic',
      'academic': 'Academic',
      'manual': 'Reference'
    };
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Import database configuration
      const { AppDataSource } = await import('../config/database');
      this.dataSource = AppDataSource;
      
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }
      
      if (this.verbose) {
        console.log(chalk.blue('✓ Database connection established'));
      }
    } catch (error) {
      console.error(chalk.red('✗ Failed to connect to database:'), error);
      throw error;
    }
  }

  async extractFromPDF(filePath: string): Promise<ExtractedMetadata> {
    try {
      const buffer = await fs.readFile(filePath);
      const data = await pdf(buffer);
      
      const metadata: ExtractedMetadata = {
        title: this.extractTitle(data, filePath),
        author: this.extractAuthor(data, filePath),
        pages: data.numpages || undefined,
        language: 'English' // Default, could be enhanced with language detection
      };

      // Extract additional metadata from PDF info if available
      if (data.info) {
        if (data.info.Title && data.info.Title.trim()) {
          metadata.title = data.info.Title.trim();
        }
        if (data.info.Author && data.info.Author.trim()) {
          metadata.author = data.info.Author.trim();
        }
        if (data.info.Subject && data.info.Subject.trim()) {
          metadata.description = data.info.Subject.trim();
        }
        if (data.info.Creator && data.info.Creator.trim()) {
          metadata.publisher = data.info.Creator.trim();
        }
      }

      // Extract year from text or filename
      metadata.publishedYear = this.extractYear(data.text, filePath);
      
      // Generate ISBN if not found
      metadata.isbn = this.generateISBN(metadata.title, metadata.author);
      
      // Determine category
      metadata.category = this.determineCategory(metadata.title, data.text);
      
      // Extract publisher and edition from text
      const textMetadata = this.extractFromText(data.text);
      if (textMetadata.publisher && !metadata.publisher) {
        metadata.publisher = textMetadata.publisher;
      }
      if (textMetadata.edition) {
        metadata.edition = textMetadata.edition;
      }

      return metadata;
    } catch (error) {
      console.error(chalk.red(`Error extracting PDF metadata from ${filePath}:`), error);
      throw error;
    }
  }

  private extractTitle(data: { info?: { Title?: string; Subject?: string } }, filePath: string): string {
    // Try PDF metadata first
    if (data.info?.Title && data.info.Title.trim()) {
      return data.info.Title.trim();
    }

    // Extract from filename
    const filename = path.basename(filePath, '.pdf');
    
    // Remove common prefixes and clean up
    let title = filename
      .replace(/^[A-Z]-/, '') // Remove "A-", "B-", etc.
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalize words
    title = title.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return title;
  }

  private extractAuthor(data: { info?: { Author?: string }; text?: string }, filePath: string): string {
    // Try PDF metadata first
    if (data.info?.Author && data.info.Author.trim()) {
      return data.info.Author.trim();
    }

    // Try to extract from text content
    const text = data.text || '';
    const authorPatterns = [
      /(?:by|author|written by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s*,\s*(?:Ph\.?D\.?|Dr\.?|Prof\.?))?/
    ];

    for (const pattern of authorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Extract from filename if it contains author info
    const filename = path.basename(filePath, '.pdf');
    const parts = filename.split(/[-_]/);
    
    // Look for author-like patterns in filename
    for (const part of parts) {
      if (part.length > 3 && /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(part.replace(/_/g, ' '))) {
        return part.replace(/_/g, ' ').trim();
      }
    }

    return 'Unknown Author';
  }

  private extractYear(text: string, filePath: string): number | undefined {
    // Look for 4-digit years in text
    const yearMatches = text.match(/\b(19|20)\d{2}\b/g);
    if (yearMatches && yearMatches.length > 0) {
      // Return the most recent reasonable year
      const years = yearMatches.map(y => parseInt(y)).filter(y => y >= 1900 && y <= new Date().getFullYear());
      if (years.length > 0) {
        return Math.max(...years);
      }
    }

    // Try filename
    const filename = path.basename(filePath);
    const filenameYearMatch = filename.match(/\b(19|20)\d{2}\b/);
    if (filenameYearMatch) {
      const year = parseInt(filenameYearMatch[0]);
      if (year >= 1900 && year <= new Date().getFullYear()) {
        return year;
      }
    }

    return undefined;
  }

  private generateISBN(title: string, author: string): string {
    // Generate a pseudo-ISBN based on title and author
    const combined = (title + author).toLowerCase().replace(/[^a-z0-9]/g, '');
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to positive number and format as ISBN-like
    const positive = Math.abs(hash);
    const isbn = `978${positive.toString().padStart(10, '0').slice(0, 10)}`;
    return isbn;
  }

  private determineCategory(title: string, text: string): string {
    const combinedText = (title + ' ' + text.slice(0, 1000)).toLowerCase();
    
    // Check against category mapping
    for (const [keyword, category] of Object.entries(this.categoryMapping)) {
      if (combinedText.includes(keyword.toLowerCase())) {
        return category;
      }
    }

    // Default category based on common patterns
    if (combinedText.includes('programming') || combinedText.includes('code') || combinedText.includes('software')) {
      return 'Technology';
    }
    if (combinedText.includes('history') || combinedText.includes('historical')) {
      return 'History';
    }
    if (combinedText.includes('business') || combinedText.includes('management')) {
      return 'Business';
    }
    if (combinedText.includes('science') || combinedText.includes('scientific')) {
      return 'Science';
    }

    return 'General';
  }

  private extractFromText(text: string): { publisher?: string; edition?: string } {
    const result: { publisher?: string; edition?: string } = {};

    // Extract publisher
    const publisherPatterns = [
      /published by\s+([A-Z][^.]*?)(?:\.|$)/i,
      /publisher[:\s]+([A-Z][^.]*?)(?:\.|$)/i,
      /©\s*\d{4}\s+([A-Z][^.]*?)(?:\.|$)/i
    ];

    for (const pattern of publisherPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 2) {
        result.publisher = match[1].trim();
        break;
      }
    }

    // Extract edition
    const editionPatterns = [
      /(\d+)(?:st|nd|rd|th)\s+edition/i,
      /edition[:\s]+(\d+)/i,
      /(\d+)(?:st|nd|rd|th)\s+ed\./i
    ];

    for (const pattern of editionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        result.edition = `${match[1]} Edition`;
        break;
      }
    }

    return result;
  }

  async scanEbooksFolder(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.ebooksPath);
      const pdfFiles = files
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .map(file => path.join(this.ebooksPath, file));

      if (this.verbose) {
        console.log(chalk.blue(`Found ${pdfFiles.length} PDF files in ${this.ebooksPath}`));
      }

      return pdfFiles;
    } catch (error) {
      console.error(chalk.red(`Error scanning ebooks folder: ${this.ebooksPath}`), error);
      throw error;
    }
  }

  async processFiles(): Promise<void> {
    const files = await this.scanEbooksFolder();
    
    if (files.length === 0) {
      console.log(chalk.yellow('No PDF files found in the ebooks folder.'));
      return;
    }

    console.log(chalk.green(`\n📚 Processing ${files.length} ebook files...\n`));

    // Initialize progress bar
    this.progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} | {filename}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    this.progressBar.start(files.length, 0);

    const results = {
      processed: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{ file: string; status: string; message: string }>
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filename = path.basename(file);
      
      this.progressBar.update(i, { filename });

      try {
        const metadata = await this.extractFromPDF(file);
        results.processed++;

        if (this.dryRun) {
          results.details.push({
            file: filename,
            status: 'dry-run',
            message: `Would import: ${metadata.title} by ${metadata.author}`
          });
          if (this.verbose) {
            console.log(chalk.cyan(`\n[DRY RUN] ${filename}:`));
            console.log(chalk.gray(`  Title: ${metadata.title}`));
            console.log(chalk.gray(`  Author: ${metadata.author}`));
            console.log(chalk.gray(`  Category: ${metadata.category}`));
            console.log(chalk.gray(`  Pages: ${metadata.pages || 'Unknown'}`));
            console.log(chalk.gray(`  ISBN: ${metadata.isbn}`));
          }
        } else {
          const imported = await this.saveToDatabase(metadata, filename);
          if (imported) {
            results.imported++;
            results.details.push({
              file: filename,
              status: 'imported',
              message: `Successfully imported: ${metadata.title}`
            });
          } else {
            results.skipped++;
            results.details.push({
              file: filename,
              status: 'skipped',
              message: `Book already exists: ${metadata.title}`
            });
          }
        }
      } catch (error) {
        results.errors++;
        results.details.push({
          file: filename,
          status: 'error',
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        
        if (this.verbose) {
          console.error(chalk.red(`\nError processing ${filename}:`), error);
        }
      }
    }

    this.progressBar.update(files.length, { filename: 'Complete!' });
    this.progressBar.stop();

    // Print summary
    this.printSummary(results);
  }

  private async saveToDatabase(metadata: ExtractedMetadata, _filename: string): Promise<boolean> {
    if (!this.dataSource) {
      throw new Error('Database not initialized');
    }

    const bookRepository = this.dataSource.getRepository(Book);

    // Check if book already exists
    if (this.skipExisting) {
      const existing = await bookRepository.findOne({
        where: [
          { isbn: metadata.isbn! },
          { title: metadata.title, author: metadata.author }
        ]
      });

      if (existing) {
        return false; // Book already exists
      }
    }

    // Create new book
    const book = new Book();
    book.isbn = metadata.isbn!;
    book.title = metadata.title;
    book.author = metadata.author;
    book.publisher = metadata.publisher || null;
    book.publishedYear = metadata.publishedYear || null;
    book.category = metadata.category!;
    book.description = metadata.description || null;
    book.language = metadata.language || 'English';
    book.pages = metadata.pages || null;
    book.edition = metadata.edition || null;
    book.totalCopies = 1;
    book.availableCopies = 1;
    book.location = 'Digital Library';
    book.isActive = true;

    await bookRepository.save(book);
    return true;
  }

  private printSummary(results: { processed: number; imported: number; skipped: number; errors: number; details: Array<{ file: string; status: string; message: string }> }): void {
    console.log(chalk.green('\n📊 Processing Summary:'));
    console.log(chalk.blue(`  Files processed: ${results.processed}`));
    
    if (this.dryRun) {
      console.log(chalk.cyan(`  Would import: ${results.processed}`));
    } else {
      console.log(chalk.green(`  Successfully imported: ${results.imported}`));
      console.log(chalk.yellow(`  Skipped (already exist): ${results.skipped}`));
    }
    
    console.log(chalk.red(`  Errors: ${results.errors}`));

    if (this.verbose && results.details.length > 0) {
      console.log(chalk.blue('\n📋 Detailed Results:'));
      results.details.forEach((detail: { file: string; status: string; message: string }) => {
        const color = detail.status === 'error' ? chalk.red : 
                     detail.status === 'skipped' ? chalk.yellow : 
                     detail.status === 'dry-run' ? chalk.cyan : chalk.green;
        console.log(color(`  ${detail.file}: ${detail.message}`));
      });
    }

    if (!this.dryRun && results.imported > 0) {
      console.log(chalk.green(`\n✅ Successfully imported ${results.imported} books to the database!`));
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
    .name('extract-ebook-metadata')
    .description('Extract metadata from ebook files and import to database')
    .version('1.0.0')
    .option('-p, --path <path>', 'Path to ebooks folder', './ebooks')
    .option('-d, --dry-run', 'Run without importing to database', false)
    .option('-v, --verbose', 'Verbose output', false)
    .option('-s, --skip-existing', 'Skip books that already exist', true)
    .option('--no-skip-existing', 'Import even if books already exist')
    .parse();

  const options = program.opts();
  const ebooksPath = path.resolve(options.path);

  console.log(chalk.blue('🔍 Ebook Metadata Extractor'));
  console.log(chalk.gray(`Scanning: ${ebooksPath}`));
  
  if (options.dryRun) {
    console.log(chalk.cyan('🧪 DRY RUN MODE - No changes will be made to the database'));
  }

  const extractor = new EbookExtractor(
    ebooksPath,
    options.dryRun,
    options.verbose,
    options.skipExisting
  );

  try {
    await extractor.initialize();
    await extractor.processFiles();
  } catch (error) {
    console.error(chalk.red('❌ Fatal error:'), error);
    process.exit(1);
  } finally {
    await extractor.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { EbookExtractor, ExtractedMetadata };