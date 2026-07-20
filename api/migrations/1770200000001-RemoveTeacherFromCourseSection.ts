import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveTeacherFromCourseSection1770200000001 implements MigrationInterface {
    name = 'RemoveTeacherFromCourseSection1770200000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key first
        const table = await queryRunner.getTable("course_sections");
        if (!table) return;

        const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("teacherId") !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey("course_sections", foreignKey);
        }

        // Check if column exists before dropping
        if (table.columns.find(column => column.name === "teacherId")) {
            // Drop the column
            await queryRunner.query(`ALTER TABLE \`course_sections\` DROP COLUMN \`teacherId\``);
        } else {
            console.log('Skipping drop of teacherId in course_sections as it does not exist');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`course_sections\` ADD \`teacherId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`course_sections\` ADD CONSTRAINT \`FK_course_sections_teacher\` FOREIGN KEY (\`teacherId\`) REFERENCES \`employees\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
}
