import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandStudentDocumentsStatusEnum1773801200000 implements MigrationInterface {
  name = 'ExpandStudentDocumentsStatusEnum1773801200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('student_documents');
    if (!exists) return;

    const info = await queryRunner.query(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'student_documents'
        AND COLUMN_NAME = 'status'
      LIMIT 1
    `);

    const current = (info?.[0]?.COLUMN_TYPE as string | undefined) || '';
    const desired = `enum('pending','submitted','verified','approved','rejected','expired')`;

    if (current.replace(/\s+/g, '').toLowerCase() === desired) return;

    await queryRunner.query(`
      ALTER TABLE student_documents
      MODIFY COLUMN status ${desired} NOT NULL DEFAULT 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('student_documents');
    if (!exists) return;

    await queryRunner.query(`
      ALTER TABLE student_documents
      MODIFY COLUMN status enum('pending','approved','rejected','expired') NOT NULL DEFAULT 'pending'
    `);
  }
}

