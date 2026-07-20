import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixRegistrationStatusEnum1764500000000 implements MigrationInterface {
  name = 'FixRegistrationStatusEnum1764500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if registrationStatus column exists
    const studentsTable = await queryRunner.getTable('students');
    const hasColumn = studentsTable?.findColumnByName('registrationStatus');
    
    if (!hasColumn) {
      console.log('registrationStatus column does not exist, skipping migration');
      return;
    }
    
    // Get current enum values to understand what we're working with
    const columnInfo = await queryRunner.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'students' 
      AND COLUMN_NAME = 'registrationStatus'
    `);
    
    console.log('Current registrationStatus column type:', columnInfo[0]?.COLUMN_TYPE);
    
    // First, check what values exist in the data
    const existingValues = await queryRunner.query(`
      SELECT DISTINCT registrationStatus FROM students
    `);
    console.log('Existing registrationStatus values:', existingValues.map((r: { registrationStatus: string }) => r.registrationStatus));
    
    // Step 1: Temporarily convert to VARCHAR to handle any value
    await queryRunner.query(`
      ALTER TABLE students 
      MODIFY COLUMN registrationStatus VARCHAR(50) NOT NULL
    `);
    
    // Step 2: Normalize all data to valid values
    // Map any invalid or old values to appropriate new values
    await queryRunner.query(`
      UPDATE students 
      SET registrationStatus = CASE
        WHEN registrationStatus IN ('ENROLLED', 'ACTIVE', 'enrolled', 'active') THEN 'REGISTERED'
        WHEN registrationStatus IN ('PRE_REGISTERED', 'pre_registered') THEN 'PRE_REGISTERED'
        WHEN registrationStatus IN ('VERIFIED', 'verified') THEN 'VERIFIED'
        ELSE 'PRE_REGISTERED'
      END
    `);
    
    // Step 3: Convert back to ENUM with the new values
    await queryRunner.query(`
      ALTER TABLE students 
      MODIFY COLUMN registrationStatus ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED') 
      DEFAULT 'PRE_REGISTERED' NOT NULL
    `);
    
    console.log('✅ Updated registrationStatus enum and migrated data');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the process
    
    // Step 1: Expand Enum to include ENROLLED
    await queryRunner.query(`
      ALTER TABLE students 
      MODIFY COLUMN registrationStatus ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED', 'ENROLLED') 
      DEFAULT 'PRE_REGISTERED' NOT NULL
    `);

    // Step 2: Migrate data back
    await queryRunner.query(`
      UPDATE students 
      SET registrationStatus = 'ENROLLED' 
      WHERE registrationStatus = 'REGISTERED'
    `);

    // Step 3: Restrict Enum to remove REGISTERED
    await queryRunner.query(`
      ALTER TABLE students 
      MODIFY COLUMN registrationStatus ENUM('PRE_REGISTERED', 'VERIFIED', 'ENROLLED') 
      DEFAULT 'PRE_REGISTERED' NOT NULL
    `);
  }
}
