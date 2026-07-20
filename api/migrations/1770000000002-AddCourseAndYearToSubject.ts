import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddCourseAndYearToSubject1770000000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('subjects');
        
        // Add courseId column if it doesn't exist
        if (!table?.findColumnByName('courseId')) {
            await queryRunner.addColumn("subjects", new TableColumn({
                name: "courseId",
                type: "varchar",
                length: "36",
                isNullable: true
            }));
            console.log('✅ Added courseId column to subjects table');
        } else {
            console.log('courseId column already exists in subjects table');
        }

        // Add yearLevel column if it doesn't exist
        if (!table?.findColumnByName('yearLevel')) {
            await queryRunner.addColumn("subjects", new TableColumn({
                name: "yearLevel",
                type: "int",
                isNullable: true
            }));
            console.log('✅ Added yearLevel column to subjects table');
        } else {
            console.log('yearLevel column already exists in subjects table');
        }

        // Add foreign key for courseId if it doesn't exist
        const foreignKeys = table?.foreignKeys || [];
        const hasCourseFK = foreignKeys.some(fk => fk.columnNames.includes('courseId'));
        
        if (!hasCourseFK && table?.findColumnByName('courseId')) {
            await queryRunner.createForeignKey("subjects", new TableForeignKey({
                columnNames: ["courseId"],
                referencedColumnNames: ["id"],
                referencedTableName: "courses",
                onDelete: "SET NULL"
            }));
            console.log('✅ Added foreign key for courseId in subjects table');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("subjects");
        const foreignKey = table!.foreignKeys.find(fk => fk.columnNames.indexOf("courseId") !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey("subjects", foreignKey);
        }
        await queryRunner.dropColumn("subjects", "courseId");
        await queryRunner.dropColumn("subjects", "yearLevel");
    }
}
