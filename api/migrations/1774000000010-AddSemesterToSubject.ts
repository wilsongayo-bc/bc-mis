import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddSemesterToSubject1774000000010 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("subjects");
        
        // Add semester column if it doesn't exist
        if (!table?.findColumnByName('semester')) {
            await queryRunner.addColumn("subjects", new TableColumn({
                name: "semester",
                type: "enum",
                enum: ['First Semester', 'Second Semester', 'Summer'],
                isNullable: true
            }));
            console.log('✅ Added semester column to subjects table');
        } else {
            console.log('semester column already exists in subjects table');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("subjects");
        
        if (table?.findColumnByName('semester')) {
            await queryRunner.dropColumn("subjects", "semester");
            console.log('✅ Dropped semester column from subjects table');
        }
    }
}
