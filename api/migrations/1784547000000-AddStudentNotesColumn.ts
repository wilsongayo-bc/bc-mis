import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentNotesColumn1784547000000 implements MigrationInterface {
  name = 'AddStudentNotesColumn1784547000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students'
        AND COLUMN_NAME = 'notes'
    `);

    if (columns.length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`students\`
        ADD COLUMN \`notes\` text NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students'
        AND COLUMN_NAME = 'notes'
    `);

    if (columns.length > 0) {
      await queryRunner.query(`
        ALTER TABLE \`students\`
        DROP COLUMN \`notes\`
      `);
    }
  }
}

