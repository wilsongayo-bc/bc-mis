import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add missing fields to the books table:
 * - description (TEXT, nullable)
 * - language (VARCHAR(50), nullable, default 'English')
 * - pages (INT, nullable)
 * - edition (VARCHAR(50), nullable)
 */
export class AddBookFields1756895500000 implements MigrationInterface {
  name = 'AddBookFields1756895500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const booksTable = await queryRunner.getTable('books');
    
    // Add description column if it doesn't exist
    if (!booksTable?.findColumnByName('description')) {
      await queryRunner.query(`
        ALTER TABLE \`books\` ADD COLUMN \`description\` TEXT NULL
      `);
      console.log('✅ Added description column to books table');
    }

    // Add language column with default value if it doesn't exist
    if (!booksTable?.findColumnByName('language')) {
      await queryRunner.query(`
        ALTER TABLE \`books\` ADD COLUMN \`language\` VARCHAR(50) NULL DEFAULT 'English'
      `);
      console.log('✅ Added language column to books table');
    }

    // Add pages column if it doesn't exist
    if (!booksTable?.findColumnByName('pages')) {
      await queryRunner.query(`
        ALTER TABLE \`books\` ADD COLUMN \`pages\` INT NULL
      `);
      console.log('✅ Added pages column to books table');
    }

    // Add edition column if it doesn't exist
    if (!booksTable?.findColumnByName('edition')) {
      await queryRunner.query(`
        ALTER TABLE \`books\` ADD COLUMN \`edition\` VARCHAR(50) NULL
      `);
      console.log('✅ Added edition column to books table');
    }

    console.log('✅ Book fields migration completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the added columns in reverse order
    await queryRunner.query(`
      ALTER TABLE \`books\` DROP COLUMN \`edition\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`books\` DROP COLUMN \`pages\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`books\` DROP COLUMN \`language\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`books\` DROP COLUMN \`description\`
    `);

    console.log('✅ Removed added fields from books table: description, language, pages, edition');
  }
}