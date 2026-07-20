import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dweezil's Code
 * Migration to fix student document references after requirements update
 * Clears old document requirement IDs from student records to prevent upload errors
 */
export class FixStudentDocumentReferences1774000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Fixing student document references...');
    console.log('📝 Clearing old requirement IDs from student records...');

    // First, check which column name format is used
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'students' 
        AND COLUMN_NAME IN ('documentsRequired', 'documents_required', 'documentsSubmitted', 'documents_submitted')
    `);

    const columnNames = columns.map((col: { COLUMN_NAME: string }) => col.COLUMN_NAME);
    console.log('📋 Found columns:', columnNames);

    // Determine which naming convention is used
    const usesSnakeCase = columnNames.some((name: string) => name.includes('_'));
    
    let query: string;
    if (usesSnakeCase) {
      // Use snake_case column names
      query = `
        UPDATE students 
        SET documents_required = '[]', 
            documents_submitted = '[]'
      `;
    } else {
      // Use camelCase column names
      query = `
        UPDATE students 
        SET documentsRequired = '[]', 
            documentsSubmitted = '[]'
      `;
    }

    const result = await queryRunner.query(query);

    console.log(`✅ Updated ${result.affectedRows || result.changedRows || 'all'} student records`);
    console.log('✅ Old requirement IDs cleared from all students');
    console.log('📝 Students can now upload documents with new requirements');
    console.log('');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️  Rollback: Cannot restore old requirement IDs');
    console.log('ℹ️  Student records will remain with empty document arrays');
  }
}
