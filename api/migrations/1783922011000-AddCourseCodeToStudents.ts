import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCourseCodeToStudents1783922011000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('students');
    const hasCourseCode = table?.findColumnByName('course_code');

    if (!hasCourseCode) {
      await queryRunner.addColumn('students', new TableColumn({
        name: 'course_code',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }));
    }

    // Populate course_code from existing course relations
    await queryRunner.query(`
      UPDATE students s
      JOIN courses c ON s.courseId = c.id
      SET s.course_code = c.courseCode
      WHERE s.course_code IS NULL AND s.courseId IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('students');
    const hasCourseCode = table?.findColumnByName('course_code');

    if (hasCourseCode) {
      await queryRunner.dropColumn('students', 'course_code');
    }
  }
}
