import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeDayOfWeekToString1770008412415 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Change the column type from enum to varchar to support multiple days
        await queryRunner.query(`ALTER TABLE \`schedules\` MODIFY COLUMN \`dayOfWeek\` VARCHAR(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert back to enum
        // Note: This will fail if there are values that are not in the enum list (e.g. multiple days)
        await queryRunner.query(`ALTER TABLE \`schedules\` MODIFY COLUMN \`dayOfWeek\` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL`);
    }

}
