import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to fix the settings table id field type
 * Changes id from varchar(36) to auto-incrementing integer
 */
export class FixSettingsIdField1672531200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, backup existing data
    await queryRunner.query(`
      CREATE TEMPORARY TABLE settings_backup AS 
      SELECT \`key\`, \`value\`, description, category, editable, createdAt, updatedAt 
      FROM settings
    `);

    // Drop the existing settings table
    await queryRunner.query('DROP TABLE settings');

    // Recreate the settings table with correct id field
    await queryRunner.query(`
      CREATE TABLE settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(255) NOT NULL UNIQUE,
        \`value\` TEXT,
        description TEXT,
        category VARCHAR(100) DEFAULT 'general',
        editable TINYINT(1) DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Restore data from backup
    await queryRunner.query(`
      INSERT INTO settings (\`key\`, \`value\`, description, category, editable, createdAt, updatedAt)
      SELECT \`key\`, \`value\`, description, category, editable, createdAt, updatedAt
      FROM settings_backup
    `);

    // Drop the temporary backup table
    await queryRunner.query('DROP TEMPORARY TABLE settings_backup');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // This migration is not easily reversible due to data type change
    // In a real scenario, you might want to implement a proper rollback
    throw new Error('This migration cannot be reverted automatically');
  }
}