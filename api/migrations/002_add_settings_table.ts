import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Migration to create the settings table for dynamic school configuration
 */
export class AddSettingsTable1672531150000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if settings table already exists
    const tableExists = await queryRunner.hasTable('settings');
    
    if (!tableExists) {
      // Create settings table
      await queryRunner.createTable(
        new Table({
          name: 'settings',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'key',
              type: 'varchar',
              length: '100',
              isUnique: true,
            },
            {
              name: 'value',
              type: 'text',
            },
            {
              name: 'description',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'category',
              type: 'varchar',
              length: '50',
              default: "'general'",
            },
            {
              name: 'editable',
              type: 'boolean',
              default: true,
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updatedAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true
      );
      console.log('✅ Settings table created');
    } else {
      console.log('ℹ️  Settings table already exists');
    }

    // Check if settings already exist
    const existingSettings = await queryRunner.query(`
      SELECT COUNT(*) as count FROM settings WHERE \`key\` IN ('school_name', 'school_motto', 'school_address', 'school_phone', 'school_email', 'academic_year', 'school_logo_url')
    `);
    
    if (existingSettings[0].count === 0) {
      // Insert default school settings
      await queryRunner.query(`
        INSERT INTO settings (\`key\`, \`value\`, description, category) VALUES
        ('school_name', 'Benedict College', 'The official name of the school', 'general'),
        ('school_motto', 'Excellence in Education', 'The school motto or tagline', 'general'),
        ('school_address', '123 Education Street, Learning City', 'The physical address of the school', 'contact'),
        ('school_phone', '+1 (555) 123-4567', 'Main contact phone number', 'contact'),
        ('school_email', 'info@benedictcollege.edu', 'Main contact email address', 'contact'),
        ('academic_year', '2024-2025', 'Current academic year', 'academic'),
        ('school_logo_url', '', 'URL or path to the school logo', 'appearance')
      `);
      console.log('✅ Default settings inserted');
    } else {
      console.log('ℹ️  Settings already exist, skipping insert');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('settings');
  }
}