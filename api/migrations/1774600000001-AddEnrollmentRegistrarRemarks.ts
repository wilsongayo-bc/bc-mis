import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnrollmentRegistrarRemarks1774600000001 implements MigrationInterface {
  name = 'AddEnrollmentRegistrarRemarks1774600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('enrollments');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn('enrollments', 'registrarRemarks');
    if (hasColumn) return;

    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD COLUMN registrarRemarks TEXT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('enrollments');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn('enrollments', 'registrarRemarks');
    if (!hasColumn) return;

    await queryRunner.query(`
      ALTER TABLE enrollments
      DROP COLUMN registrarRemarks
    `);
  }
}
