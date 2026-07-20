import { MigrationInterface, QueryRunner } from 'typeorm';

// Dweezil's Code
export class UpdateRegistrationAndEnrollmentStatus1738000000000 implements MigrationInterface {
  name = 'UpdateRegistrationAndEnrollmentStatus1738000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('students')) {
      const hasRegistrationStatus = await queryRunner.hasColumn('students', 'registrationStatus');

      if (!hasRegistrationStatus) {
        await queryRunner.query(`
          ALTER TABLE students 
          ADD COLUMN registrationStatus 
          ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED', 'FOR_ENROLLMENT', 'FOR_SCHEDULING') 
          DEFAULT 'PRE_REGISTERED' NOT NULL
        `);
      } else {
        await queryRunner.query(`
          ALTER TABLE students 
          MODIFY COLUMN registrationStatus 
          ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED', 'FOR_ENROLLMENT', 'FOR_SCHEDULING') 
          DEFAULT 'PRE_REGISTERED'
        `);
      }
    }

    if (await queryRunner.hasTable('enrollments')) {
      const hasStatus = await queryRunner.hasColumn('enrollments', 'status');
      if (hasStatus) {
        await queryRunner.query(`
          ALTER TABLE enrollments 
          MODIFY COLUMN status 
          ENUM('PENDING', 'VERIFIED', 'ENROLLED', 'COMPLETED', 'DROPPED', 'FAILED') 
          DEFAULT 'PENDING'
        `);
      }

      const hasSelectedSubjects = await queryRunner.hasColumn('enrollments', 'selectedSubjects');
      if (!hasSelectedSubjects) {
        await queryRunner.query(`
          ALTER TABLE enrollments 
          ADD COLUMN selectedSubjects JSON NULL
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('enrollments')) {
      const hasSelectedSubjects = await queryRunner.hasColumn('enrollments', 'selectedSubjects');
      if (hasSelectedSubjects) {
        await queryRunner.query(`
          ALTER TABLE enrollments 
          DROP COLUMN selectedSubjects
        `);
      }

      const hasStatus = await queryRunner.hasColumn('enrollments', 'status');
      if (hasStatus) {
        await queryRunner.query(`
          ALTER TABLE enrollments 
          MODIFY COLUMN status 
          ENUM('ENROLLED', 'COMPLETED', 'DROPPED', 'FAILED') 
          DEFAULT 'ENROLLED'
        `);
      }
    }

    if (await queryRunner.hasTable('students')) {
      const hasRegistrationStatus = await queryRunner.hasColumn('students', 'registrationStatus');
      if (hasRegistrationStatus) {
        await queryRunner.query(`
          ALTER TABLE students 
          MODIFY COLUMN registrationStatus 
          ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED') 
          DEFAULT 'PRE_REGISTERED'
        `);
      }
    }
  }
}
