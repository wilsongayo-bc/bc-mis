import { MigrationInterface, QueryRunner } from 'typeorm';

// Dweezil's Code
// Migration to ensure courseId foreign key exists
// This handles cases where the column was added but FK creation failed
export class EnsureCourseIdForeignKey1770930000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Starting migration: Ensure courseId foreign key exists');

    // Check if courseId column exists
    const checkColumn = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students' 
        AND COLUMN_NAME = 'courseId'
    `);

    if (checkColumn[0].count === 0) {
      console.log('➕ Adding courseId column to students table...');
      await queryRunner.query(`
        ALTER TABLE students 
        ADD COLUMN courseId VARCHAR(36) NULL 
        COMMENT 'Temporary storage for course selection before enrollment is created'
      `);
      console.log('✅ Added courseId column');
    } else {
      console.log('ℹ️  courseId column already exists');
    }

    // Check if foreign key exists
    const checkFK = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students' 
        AND CONSTRAINT_NAME = 'FK_students_courseId'
    `);

    if (checkFK[0].count === 0) {
      console.log('➕ Adding foreign key constraint FK_students_courseId...');
      await queryRunner.query(`
        ALTER TABLE students 
        ADD CONSTRAINT FK_students_courseId 
        FOREIGN KEY (courseId) REFERENCES courses(id) 
        ON DELETE SET NULL
      `);
      console.log('✅ Added foreign key constraint');
    } else {
      console.log('ℹ️  Foreign key constraint already exists');
    }

    console.log('✅ Migration complete: courseId column and foreign key verified');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️  Rolling back migration: Remove courseId foreign key and column');

    // Check if foreign key exists
    const checkFK = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students' 
        AND CONSTRAINT_NAME = 'FK_students_courseId'
    `);

    if (checkFK[0].count > 0) {
      await queryRunner.query(`
        ALTER TABLE students 
        DROP FOREIGN KEY FK_students_courseId
      `);
      console.log('✅ Removed foreign key constraint');
    }

    // Check if column exists
    const checkColumn = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students' 
        AND COLUMN_NAME = 'courseId'
    `);

    if (checkColumn[0].count > 0) {
      await queryRunner.query(`
        ALTER TABLE students 
        DROP COLUMN courseId
      `);
      console.log('✅ Removed courseId column');
    }
  }
}
