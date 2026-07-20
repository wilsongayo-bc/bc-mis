import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class FixScheduleSubjectId1770000000001 implements MigrationInterface {
    name = 'FixScheduleSubjectId1770000000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('schedules');
        const courseIdColumn = table?.columns.find(c => c.name === 'courseId');
        const subjectIdColumn = table?.columns.find(c => c.name === 'subjectId');
        
        // 1. Rename column courseId to subjectId if it exists
        if (courseIdColumn) {
            const foreignKey = table!.foreignKeys.find(fk => fk.columnNames.indexOf('courseId') !== -1);
            
            // Drop the old foreign key if it exists
            if (foreignKey) {
                await queryRunner.dropForeignKey('schedules', foreignKey);
            }

            // Note: We use changeColumn instead of renameColumn to ensure type consistency
            await queryRunner.renameColumn('schedules', 'courseId', 'subjectId');
        } else if (subjectIdColumn) {
            console.log('ℹ️ subjectId column already exists in schedules table, skipping rename');
        } else {
            console.warn('⚠️ Neither courseId nor subjectId column found in schedules table');
        }

        // 2. Add new foreign key to subjects table if it doesn't exist
        const updatedTable = await queryRunner.getTable('schedules');
        const subjectFk = updatedTable?.foreignKeys.find(fk => fk.columnNames.indexOf('subjectId') !== -1);
        
        if (!subjectFk && updatedTable?.columns.find(c => c.name === 'subjectId')) {
            await queryRunner.createForeignKey(
                'schedules',
                new TableForeignKey({
                    columnNames: ['subjectId'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'subjects',
                    onDelete: 'CASCADE',
                })
            );
        }

        console.log('✅ Renamed courseId to subjectId in schedules table and updated FK');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('schedules');
        const foreignKey = table!.foreignKeys.find(fk => fk.columnNames.indexOf('subjectId') !== -1);

        // 1. Drop the new foreign key
        if (foreignKey) {
            await queryRunner.dropForeignKey('schedules', foreignKey);
        }

        // 2. Rename column back to courseId
        await queryRunner.renameColumn('schedules', 'subjectId', 'courseId');

        // 3. Restore old foreign key to courses table
        await queryRunner.createForeignKey(
            'schedules',
            new TableForeignKey({
                columnNames: ['courseId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'courses',
                onDelete: 'CASCADE',
            })
        );

        console.log('✅ Reverted subjectId back to courseId in schedules table');
    }
}
