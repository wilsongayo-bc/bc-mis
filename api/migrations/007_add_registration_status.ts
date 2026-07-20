import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegistrationStatus1758173500000 implements MigrationInterface {
  name = 'AddRegistrationStatus1758173500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if registrationStatus column already exists
    const studentsTable = await queryRunner.getTable('students');
    const hasRegistrationStatus = studentsTable?.findColumnByName('registrationStatus');
    
    if (hasRegistrationStatus) {
      console.log('registrationStatus column already exists in students table');
      return;
    }
    
    // Add registrationStatus column to students table
    await queryRunner.query(`
      ALTER TABLE students 
      ADD COLUMN registrationStatus ENUM('PRE_REGISTERED', 'VERIFIED', 'ENROLLED') 
      DEFAULT 'PRE_REGISTERED' NOT NULL
    `);

    // Update existing students to have ENROLLED status (assuming they are already enrolled)
    await queryRunner.query(`
      UPDATE students 
      SET registrationStatus = 'ENROLLED' 
      WHERE registrationStatus = 'PRE_REGISTERED'
    `);
    
    console.log('✅ Added registrationStatus column to students table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove registrationStatus column
    await queryRunner.query(`
      ALTER TABLE students 
      DROP COLUMN registrationStatus
    `);
  }
}