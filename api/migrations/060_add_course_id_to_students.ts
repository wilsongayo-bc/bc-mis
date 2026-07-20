import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

// Dweezil's Code - Add courseId field to students table for direct course assignment
export class AddCourseIdToStudents1735000000000 implements MigrationInterface {
  name = 'AddCourseIdToStudents1735000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if courseId column already exists
    const table = await queryRunner.getTable('students');
    const courseIdColumn = table?.findColumnByName('courseId');

    if (!courseIdColumn) {
      // Add courseId column to students table
      await queryRunner.addColumn(
        'students',
        new TableColumn({
          name: 'courseId',
          type: 'varchar',
          length: '36',
          isNullable: true,
        })
      );

      // Add foreign key constraint
      await queryRunner.createForeignKey(
        'students',
        new TableForeignKey({
          columnNames: ['courseId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'courses',
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        })
      );

      console.log('✅ Added courseId column to students table');
    } else {
      console.log('ℹ️ courseId column already exists in students table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key first
    const table = await queryRunner.getTable('students');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('courseId') !== -1
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey('students', foreignKey);
    }

    // Drop column
    await queryRunner.dropColumn('students', 'courseId');
    console.log('✅ Removed courseId column from students table');
  }
}
