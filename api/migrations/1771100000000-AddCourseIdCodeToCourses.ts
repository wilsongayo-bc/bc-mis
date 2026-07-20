import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseIdCodeToCourses1771100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const coursesTable = await queryRunner.getTable('courses');
    const hasIdCode = coursesTable?.findColumnByName('idCode');

    if (!hasIdCode) {
      await queryRunner.query(`
        ALTER TABLE courses
        ADD COLUMN idCode VARCHAR(2) NULL
      `);
    }

    const refreshedCoursesTable = await queryRunner.getTable('courses');
    const hasUniqueIndex =
      refreshedCoursesTable?.indices?.some(index => index.isUnique && index.columnNames.length === 1 && index.columnNames[0] === 'idCode') ||
      false;

    if (!hasUniqueIndex) {
      await queryRunner.query(`
        CREATE UNIQUE INDEX IDX_courses_idCode_unique ON courses (idCode)
      `);
    }

    await queryRunner.query(`
      UPDATE courses
      SET idCode = '01'
      WHERE UPPER(courseCode) = 'BTVTED' AND (idCode IS NULL OR idCode = '')
    `);

    await queryRunner.query(`
      UPDATE courses
      SET idCode = '02'
      WHERE UPPER(courseCode) = 'BSIS' AND (idCode IS NULL OR idCode = '')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const coursesTable = await queryRunner.getTable('courses');
    const hasIdCode = coursesTable?.findColumnByName('idCode');

    if (hasIdCode) {
      const hasIndex = coursesTable?.indices?.some(index => index.name === 'IDX_courses_idCode_unique') || false;
      if (hasIndex) {
        await queryRunner.query(`
          DROP INDEX IDX_courses_idCode_unique ON courses
        `);
      }

      await queryRunner.query(`
        ALTER TABLE courses
        DROP COLUMN idCode
      `);
    }
  }
}
