import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPrerequisiteCategory1756974000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('subject_prerequisites');
        const hasCategory = table?.findColumnByName('category');
        
        if (!hasCategory) {
            await queryRunner.addColumn(
                'subject_prerequisites',
                new TableColumn({
                    name: 'category',
                    type: 'enum',
                    enum: ['required', 'corequisite'],
                    default: "'required'",
                    isNullable: false
                })
            );
            console.log('✅ Added category column to subject_prerequisites table');
        } else {
            console.log('Category column already exists in subject_prerequisites table');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('subject_prerequisites', 'category');
    }
}