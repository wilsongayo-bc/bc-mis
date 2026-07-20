import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateStudentStatusEnum1758173600000 implements MigrationInterface {
  name = 'UpdateStudentStatusEnum1758173600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, expand the enum to include both old and new values
    await queryRunner.query(`
      ALTER TABLE students 
      MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'ENROLLED', 'PRE_REGISTERED') 
      NOT NULL DEFAULT 'ACTIVE'
    `);

    // Update existing records to map old statuses to new ones
    // ACTIVE -> ENROLLED, others -> PRE_REGISTERED
    await queryRunner.query(`
      UPDATE students 
      SET status = CASE 
        WHEN status = 'ACTIVE' THEN 'ENROLLED'
        ELSE 'PRE_REGISTERED'
      END
    `);

    // Finally, remove old enum values and keep only new ones
    await queryRunner.query(`
      ALTER TABLE students 
      MODIFY COLUMN status ENUM('ENROLLED', 'PRE_REGISTERED') 
      NOT NULL DEFAULT 'ENROLLED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to old enum values
    await queryRunner.query(`
      ALTER TABLE students 
      MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED') 
      NOT NULL DEFAULT 'ACTIVE'
    `);

    // Map new statuses back to old ones
    await queryRunner.query(`
      UPDATE students 
      SET status = CASE 
        WHEN status = 'ENROLLED' THEN 'ACTIVE'
        WHEN status = 'PRE_REGISTERED' THEN 'INACTIVE'
        ELSE 'ACTIVE'
      END
    `);
  }
}