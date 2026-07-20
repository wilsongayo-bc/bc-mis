import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyStudentRegistrationStatus1774500000000 implements MigrationInterface {
  name = 'SimplifyStudentRegistrationStatus1774500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('students');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn('students', 'registrationStatus');
    if (!hasColumn) return;

    await queryRunner.query(`
      ALTER TABLE students
      MODIFY COLUMN registrationStatus VARCHAR(32) NOT NULL DEFAULT 'PRE_REGISTERED'
    `);

    await queryRunner.query(`
      UPDATE students
      SET registrationStatus = CASE
        WHEN registrationStatus IN ('VERIFIED', 'FOR_ENROLLMENT', 'FOR_SCHEDULING', 'SCHEDULED', 'ENROLLED') THEN 'REGISTERED'
        WHEN registrationStatus = 'WITHDRAWN' THEN 'WITHDRAWN'
        ELSE registrationStatus
      END
    `);

    await queryRunner.query(`
      ALTER TABLE students
      MODIFY COLUMN registrationStatus
      ENUM('PRE_REGISTERED', 'REGISTERED', 'WITHDRAWN')
      NOT NULL DEFAULT 'PRE_REGISTERED'
    `);

    if (await queryRunner.hasColumn('students', 'status')) {
      await queryRunner.query(`
        ALTER TABLE students
        MODIFY COLUMN status
        ENUM('ENROLLED', 'PRE_REGISTERED')
        NOT NULL DEFAULT 'PRE_REGISTERED'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('students');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn('students', 'registrationStatus');
    if (!hasColumn) return;

    await queryRunner.query(`
      ALTER TABLE students
      MODIFY COLUMN registrationStatus
      ENUM('PRE_REGISTERED', 'REGISTERED', 'WITHDRAWN', 'VERIFIED', 'FOR_ENROLLMENT', 'FOR_SCHEDULING', 'SCHEDULED', 'ENROLLED')
      NOT NULL DEFAULT 'PRE_REGISTERED'
    `);

    if (await queryRunner.hasColumn('students', 'status')) {
      await queryRunner.query(`
        ALTER TABLE students
        MODIFY COLUMN status
        ENUM('ENROLLED', 'PRE_REGISTERED')
        NOT NULL DEFAULT 'ENROLLED'
      `);
    }
  }
}
