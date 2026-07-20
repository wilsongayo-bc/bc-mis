import { MigrationInterface, QueryRunner } from 'typeorm';

// Dweezil's Code - Add ENROLLED to RegistrationStatus enum to match entity definition
export class AddEnrolledToRegistrationStatus1770000000002 implements MigrationInterface {
  name = 'AddEnrolledToRegistrationStatus1770000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Adding ENROLLED to registrationStatus enum...');
    
    // Add ENROLLED to registrationStatus enum
    await queryRunner.query(`
      ALTER TABLE students 
      MODIFY COLUMN registrationStatus 
      ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED', 'FOR_ENROLLMENT', 'FOR_SCHEDULING', 'ENROLLED') 
      DEFAULT 'PRE_REGISTERED'
    `);
    
    console.log('✅ Successfully added ENROLLED to registrationStatus enum');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Removing ENROLLED from registrationStatus enum...');
    
    // First, update any ENROLLED records to FOR_SCHEDULING
    await queryRunner.query(`
      UPDATE students 
      SET registrationStatus = 'FOR_SCHEDULING' 
      WHERE registrationStatus = 'ENROLLED'
    `);
    
    console.log('✅ Updated ENROLLED records to FOR_SCHEDULING');

    // Then remove ENROLLED from enum
    await queryRunner.query(`
      ALTER TABLE students 
      MODIFY COLUMN registrationStatus 
      ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED', 'FOR_ENROLLMENT', 'FOR_SCHEDULING') 
      DEFAULT 'PRE_REGISTERED'
    `);
    
    console.log('✅ Successfully removed ENROLLED from registrationStatus enum');
  }
}
