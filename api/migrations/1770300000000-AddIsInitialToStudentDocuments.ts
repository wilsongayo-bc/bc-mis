import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsInitialToStudentDocuments1770300000000 implements MigrationInterface {
  name = 'AddIsInitialToStudentDocuments1770300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('student_documents');
    const hasColumn = table?.findColumnByName('is_initial');

    if (!hasColumn) {
      await queryRunner.query(`
        ALTER TABLE \`student_documents\` 
        ADD COLUMN \`is_initial\` tinyint NOT NULL DEFAULT 0
      `);
      console.log('✅ Added is_initial column to student_documents table');
    } else {
      console.log('is_initial column already exists in student_documents table');
    }

    // Add index for better query performance
    const hasIndex = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'student_documents' 
      AND index_name = 'IDX_student_documents_is_initial'
    `);

    if (hasIndex[0].count === 0) {
      await queryRunner.query(`
        CREATE INDEX \`IDX_student_documents_is_initial\` 
        ON \`student_documents\` (\`is_initial\`)
      `);
      console.log('✅ Added index on is_initial column');
    } else {
      console.log('Index on is_initial column already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX \`IDX_student_documents_is_initial\` 
      ON \`student_documents\`
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE \`student_documents\` 
      DROP COLUMN \`is_initial\`
    `);
  }
}
