import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuardianColumns1672531108000 implements MigrationInterface {
  name = 'AddGuardianColumns1672531108000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check which columns already exist
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'students' 
      AND COLUMN_NAME IN ('guardian_name', 'guardian_phone', 'guardian_email', 'medical_info', 'balance', 'graduation_date')
    `);
    
    const existingColumns = columns.map((col: { COLUMN_NAME: string }) => col.COLUMN_NAME);
    
    // Build ALTER TABLE statement with only missing columns
    const columnsToAdd = [];
    
    if (!existingColumns.includes('guardian_name')) {
      columnsToAdd.push("ADD COLUMN `guardian_name` varchar(200) NOT NULL DEFAULT ''");
    }
    if (!existingColumns.includes('guardian_phone')) {
      columnsToAdd.push("ADD COLUMN `guardian_phone` varchar(20) NOT NULL DEFAULT ''");
    }
    if (!existingColumns.includes('guardian_email')) {
      columnsToAdd.push("ADD COLUMN `guardian_email` varchar(255) NULL");
    }
    if (!existingColumns.includes('medical_info')) {
      columnsToAdd.push("ADD COLUMN `medical_info` text NULL");
    }
    if (!existingColumns.includes('balance')) {
      columnsToAdd.push("ADD COLUMN `balance` decimal(10,2) NOT NULL DEFAULT 0");
    }
    if (!existingColumns.includes('graduation_date')) {
      columnsToAdd.push("ADD COLUMN `graduation_date` date NULL");
    }
    
    if (columnsToAdd.length > 0) {
      await queryRunner.query(`
        ALTER TABLE \`students\` 
        ${columnsToAdd.join(',\n        ')}
      `);
      console.log(`✅ Added ${columnsToAdd.length} missing columns to students table`);
    } else {
      console.log('ℹ️  All guardian columns already exist, skipping');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the added guardian columns
    await queryRunner.query(`
      ALTER TABLE \`students\` 
      DROP COLUMN \`guardian_name\`,
      DROP COLUMN \`guardian_phone\`,
      DROP COLUMN \`guardian_email\`,
      DROP COLUMN \`medical_info\`,
      DROP COLUMN \`balance\`,
      DROP COLUMN \`graduation_date\`
    `);
  }
}