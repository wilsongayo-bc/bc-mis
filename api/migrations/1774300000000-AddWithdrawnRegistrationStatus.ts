import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWithdrawnRegistrationStatus1774300000000 implements MigrationInterface {
  name = 'AddWithdrawnRegistrationStatus1774300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('students');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn('students', 'registrationStatus');
    if (!hasColumn) return;

    const info = await queryRunner.query(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students'
        AND COLUMN_NAME = 'registrationStatus'
      LIMIT 1
    `);

    const current = (info?.[0]?.COLUMN_TYPE as string | undefined) || '';
    if (current.includes("'WITHDRAWN'") || current.includes('"WITHDRAWN"')) return;

    await queryRunner.query(`
      ALTER TABLE students
      MODIFY COLUMN registrationStatus
      ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED', 'FOR_ENROLLMENT', 'FOR_SCHEDULING', 'SCHEDULED', 'ENROLLED', 'WITHDRAWN')
      NOT NULL DEFAULT 'PRE_REGISTERED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('students');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn('students', 'registrationStatus');
    if (!hasColumn) return;

    await queryRunner.query(`
      UPDATE students
      SET registrationStatus = 'PRE_REGISTERED'
      WHERE registrationStatus = 'WITHDRAWN'
    `);

    await queryRunner.query(`
      ALTER TABLE students
      MODIFY COLUMN registrationStatus
      ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED', 'FOR_ENROLLMENT', 'FOR_SCHEDULING', 'SCHEDULED', 'ENROLLED')
      NOT NULL DEFAULT 'PRE_REGISTERED'
    `);
  }
}
