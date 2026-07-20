import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddBookRelations1770000000000 implements MigrationInterface {
    name = 'AddBookRelations1770000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('books');

        // Add gradeLevelId column
        if (!table?.columns.find(c => c.name === 'gradeLevelId')) {
            await queryRunner.addColumn(
                'books',
                new TableColumn({
                    name: 'gradeLevelId',
                    type: 'varchar',
                    length: '36',
                    isNullable: true,
                })
            );
        }

        // Add courseId column
        if (!table?.columns.find(c => c.name === 'courseId')) {
            await queryRunner.addColumn(
                'books',
                new TableColumn({
                    name: 'courseId',
                    type: 'varchar',
                    length: '36',
                    isNullable: true,
                })
            );
        }

        // Refresh table metadata to check for foreign keys on potentially new columns
        const updatedTable = await queryRunner.getTable('books');

        // Add foreign key for gradeLevelId
        if (!updatedTable?.foreignKeys.find(fk => fk.columnNames.indexOf('gradeLevelId') !== -1)) {
            await queryRunner.createForeignKey(
                'books',
                new TableForeignKey({
                    columnNames: ['gradeLevelId'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'grade_levels',
                    onDelete: 'SET NULL',
                })
            );
        }

        // Add foreign key for courseId
        if (!updatedTable?.foreignKeys.find(fk => fk.columnNames.indexOf('courseId') !== -1)) {
            await queryRunner.createForeignKey(
                'books',
                new TableForeignKey({
                    columnNames: ['courseId'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'courses',
                    onDelete: 'SET NULL',
                })
            );
        }

        console.log('✅ Added gradeLevelId and courseId columns with foreign keys to books table');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('books');
        
        // Remove foreign key for courseId
        const courseForeignKey = table!.foreignKeys.find(fk => fk.columnNames.indexOf('courseId') !== -1);
        if (courseForeignKey) {
            await queryRunner.dropForeignKey('books', courseForeignKey);
        }

        // Remove foreign key for gradeLevelId
        const gradeLevelForeignKey = table!.foreignKeys.find(fk => fk.columnNames.indexOf('gradeLevelId') !== -1);
        if (gradeLevelForeignKey) {
            await queryRunner.dropForeignKey('books', gradeLevelForeignKey);
        }

        // Drop columns
        await queryRunner.dropColumn('books', 'courseId');
        await queryRunner.dropColumn('books', 'gradeLevelId');

        console.log('✅ Removed gradeLevelId and courseId columns from books table');
    }
}
