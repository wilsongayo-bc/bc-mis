import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeStudentIdNullable1704067300000 implements MigrationInterface {
    name = 'MakeStudentIdNullable1704067300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, drop the unique constraint on studentId if it exists
        try {
            await queryRunner.query(`ALTER TABLE \`students\` DROP INDEX \`IDX_studentId\``);
        } catch (_error) {
            // Index might not exist, continue
            console.log('Index IDX_studentId not found, continuing...');
        }
        
        // Make studentId nullable
        await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`studentId\` varchar(20) NULL`);
        
        // Re-add the unique constraint but allow nulls
        await queryRunner.query(`ALTER TABLE \`students\` ADD UNIQUE INDEX \`IDX_studentId\` (\`studentId\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the unique constraint
        try {
            await queryRunner.query(`ALTER TABLE \`students\` DROP INDEX \`IDX_studentId\``);
        } catch (_error) {
            console.log('Index IDX_studentId not found, continuing...');
        }
        
        // Make studentId NOT NULL (this might fail if there are null values)
        await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`studentId\` varchar(20) NOT NULL`);
        
        // Re-add the unique constraint
        await queryRunner.query(`ALTER TABLE \`students\` ADD UNIQUE INDEX \`IDX_studentId\` (\`studentId\`)`);
    }
}