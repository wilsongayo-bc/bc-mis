import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add book cover image fields to the books table:
 * - coverImageUrl (VARCHAR(500), nullable)
 * - thumbnailUrl (VARCHAR(500), nullable)
 */
export class AddBookCoverFields1759558700000 implements MigrationInterface {
  name = 'AddBookCoverFields1759558700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const booksTable = await queryRunner.getTable('books');
    
    // Add coverImageUrl column if it doesn't exist
    if (!booksTable?.findColumnByName('coverImageUrl')) {
      await queryRunner.query(`
        ALTER TABLE \`books\` ADD COLUMN \`coverImageUrl\` VARCHAR(500) NULL
      `);
      console.log('✅ Added coverImageUrl column to books table');
    }

    // Add thumbnailUrl column if it doesn't exist
    if (!booksTable?.findColumnByName('thumbnailUrl')) {
      await queryRunner.query(`
        ALTER TABLE \`books\` ADD COLUMN \`thumbnailUrl\` VARCHAR(500) NULL
      `);
      console.log('✅ Added thumbnailUrl column to books table');
    }

    // Create index for faster image queries if it doesn't exist
    const indexes = await queryRunner.query(`
      SHOW INDEX FROM \`books\` WHERE Key_name = 'idx_books_cover_image'
    `);
    
    if (indexes.length === 0) {
      await queryRunner.query(`
        CREATE INDEX \`idx_books_cover_image\` ON \`books\` (\`coverImageUrl\`)
      `);
      console.log('✅ Created index on coverImageUrl');
    }

    console.log('✅ Added book cover image fields to books table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX \`idx_books_cover_image\` ON \`books\`
    `);

    // Remove thumbnailUrl column
    await queryRunner.query(`
      ALTER TABLE \`books\` DROP COLUMN \`thumbnailUrl\`
    `);

    // Remove coverImageUrl column
    await queryRunner.query(`
      ALTER TABLE \`books\` DROP COLUMN \`coverImageUrl\`
    `);

    console.log('✅ Removed book cover image fields from books table');
  }
}