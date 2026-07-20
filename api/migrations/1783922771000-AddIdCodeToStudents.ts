import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIdCodeToStudents1783922771000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('students');
    
    // Drop previous mistake if it exists
    const hasCourseCode = table?.findColumnByName('course_code');
    if (hasCourseCode) {
      await queryRunner.dropColumn('students', 'course_code');
    }

    // Add idCode column
    const hasIdCode = table?.findColumnByName('idCode');
    if (!hasIdCode) {
      await queryRunner.addColumn('students', new TableColumn({
        name: 'idCode',
        type: 'varchar',
        length: '10',
        isNullable: true,
      }));
    }

    // Populate idCode from existing course relations (using courses.idCode)
    await queryRunner.query(`
      UPDATE students s
      JOIN courses c ON s.courseId = c.id
      SET s.idCode = c.idCode
      WHERE s.idCode IS NULL AND s.courseId IS NOT NULL
    `);

    // Fix existing studentId format from YYYY-IDCODE-SEQUENCE to YYYY-SEQUENCE
    // Only target those that match the old pattern (e.g., 2026-02-00155)
    await queryRunner.query(`
      UPDATE students 
      SET studentId = CONCAT(SUBSTRING_INDEX(studentId, '-', 1), '-', SUBSTRING_INDEX(studentId, '-', -1))
      WHERE studentId REGEXP '^[0-9]{4}-[A-Za-z0-9]{2}-[0-9]{5}$'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('students');
    const hasIdCode = table?.findColumnByName('idCode');

    if (hasIdCode) {
      await queryRunner.dropColumn('students', 'idCode');
    }
  }
}
