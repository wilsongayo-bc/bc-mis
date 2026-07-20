import { MigrationInterface, QueryRunner } from 'typeorm';

// Dweezil's Code
// Migration to add courseId field to students table for temporary storage
// This allows tracking course selection before enrollment is created
export class AddCourseIdToStudents1770920000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Starting migration: Add courseId to students table');

    // Check if courseId column already exists
    const checkColumn = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students' 
        AND COLUMN_NAME = 'courseId'
    `);

    if (checkColumn[0].count > 0) {
      console.log('ℹ️  courseId column already exists, skipping...');
      return;
    }

    // Add courseId column to students table (nullable, for temporary storage)
    await queryRunner.query(`
      ALTER TABLE students 
      ADD COLUMN courseId VARCHAR(36) NULL 
      COMMENT 'Temporary storage for course selection before enrollment is created'
    `);

    console.log('✅ Added courseId column to students table');

    // Dweezil's Code - Add foreign key constraint to courses table
    await queryRunner.query(`
      ALTER TABLE students 
      ADD CONSTRAINT FK_students_courseId 
      FOREIGN KEY (courseId) REFERENCES courses(id) 
      ON DELETE SET NULL
    `);

    console.log('✅ Added foreign key constraint for courseId in students table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️  Rolling back migration: Remove courseId from students table');

    // Check if foreign key exists
    const checkFK = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students' 
        AND CONSTRAINT_NAME = 'FK_students_courseId'
    `);

    // Remove foreign key constraint first if it exists
    if (checkFK[0].count > 0) {
      await queryRunner.query(`
        ALTER TABLE students 
        DROP FOREIGN KEY FK_students_courseId
      `);
      console.log('✅ Removed foreign key constraint for courseId');
    }

    // Check if column exists
    const checkColumn = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students' 
        AND COLUMN_NAME = 'courseId'
    `);

    // Remove courseId column from students table if it exists
    if (checkColumn[0].count > 0) {
      await queryRunner.query(`
        ALTER TABLE students 
        DROP COLUMN courseId
      `);
      console.log('✅ Removed courseId column from students table');
    }
  }
}
