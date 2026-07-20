import { MigrationInterface, QueryRunner } from "typeorm";

export class FixGradeLevelColumn1704067100000 implements MigrationInterface {
    name = 'FixGradeLevelColumn1704067100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, add the new grade_level_id column
        await queryRunner.query(`ALTER TABLE \`students\` ADD COLUMN \`grade_level_id\` varchar(36) NULL`);
        
        // Migrate data from gradeLevel to grade_level_id by mapping to GradeLevel UUIDs
        // For now, set all to NULL since we need proper GradeLevel records
        await queryRunner.query(`UPDATE \`students\` SET \`grade_level_id\` = NULL`);
        
        // Drop the old gradeLevel column
        await queryRunner.query(`ALTER TABLE \`students\` DROP COLUMN \`gradeLevel\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add back the old gradeLevel column
        await queryRunner.query(`ALTER TABLE \`students\` ADD COLUMN \`gradeLevel\` int NOT NULL DEFAULT 1`);
        
        // Drop the new grade_level_id column
        await queryRunner.query(`ALTER TABLE \`students\` DROP COLUMN \`grade_level_id\``);
    }
}