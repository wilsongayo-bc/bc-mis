import { MigrationInterface, QueryRunner } from "typeorm";

export class FixScheduleSemesterValues1770560500000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE schedules 
            SET semester = 'First Semester' 
            WHERE semester = 'FIRST'
        `);
        
        await queryRunner.query(`
            UPDATE schedules 
            SET semester = 'Second Semester' 
            WHERE semester = 'SECOND'
        `);
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // No safe revert as we don't know which ones were originally 'FIRST' vs 'First Semester'
        // But for data fix migrations, down is often skipped or just a no-op
    }

}
