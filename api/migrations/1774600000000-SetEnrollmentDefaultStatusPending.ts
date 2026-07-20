import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetEnrollmentDefaultStatusPending1774600000000 implements MigrationInterface {
  name = 'SetEnrollmentDefaultStatusPending1774600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('enrollments');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn('enrollments', 'status');
    if (!hasColumn) return;

    await queryRunner.query(`
      ALTER TABLE enrollments
      MODIFY COLUMN status
      ENUM('PENDING', 'VERIFIED', 'ENROLLED', 'COMPLETED', 'DROPPED', 'FAILED')
      NOT NULL DEFAULT 'PENDING'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('enrollments');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn('enrollments', 'status');
    if (!hasColumn) return;

    await queryRunner.query(`
      ALTER TABLE enrollments
      MODIFY COLUMN status
      ENUM('PENDING', 'VERIFIED', 'ENROLLED', 'COMPLETED', 'DROPPED', 'FAILED')
      NOT NULL DEFAULT 'ENROLLED'
    `);
  }
}
