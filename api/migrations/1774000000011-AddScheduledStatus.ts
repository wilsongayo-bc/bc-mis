import { MigrationInterface, QueryRunner } from "typeorm";

// Dweezil's Code - Add SCHEDULED status to registration_status enum
export class AddScheduledStatus1774000000011 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add SCHEDULED to the registrationStatus enum
        await queryRunner.query(`
            ALTER TABLE students 
            MODIFY COLUMN registrationStatus 
            ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED', 'FOR_ENROLLMENT', 'FOR_SCHEDULING', 'SCHEDULED', 'ENROLLED') 
            NOT NULL DEFAULT 'PRE_REGISTERED'
        `);
        
        console.log('✅ Added SCHEDULED status to registrationStatus enum');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove SCHEDULED from the registrationStatus enum
        await queryRunner.query(`
            ALTER TABLE students 
            MODIFY COLUMN registrationStatus 
            ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED', 'FOR_ENROLLMENT', 'FOR_SCHEDULING', 'ENROLLED') 
            NOT NULL DEFAULT 'PRE_REGISTERED'
        `);
        
        console.log('✅ Removed SCHEDULED status from registrationStatus enum');
    }
}
