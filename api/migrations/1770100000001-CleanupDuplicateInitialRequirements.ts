import { MigrationInterface, QueryRunner } from "typeorm";

export class CleanupDuplicateInitialRequirements1770100000001 implements MigrationInterface {
    name = 'CleanupDuplicateInitialRequirements1770100000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove the old "Complete Grade 12 Report Card" requirement as it's redundant
        // The new requirements (First Semester Report Card + CoE) replace this one
        await queryRunner.query(`
            UPDATE document_requirements 
            SET is_initial = 0 
            WHERE id = 'a997fc62-17c8-43aa-b788-d2e0f1575117'
        `);
        
        // Also remove the "Certified First Sem Grade & CoE" combined requirement
        // as we now have them as separate requirements
        await queryRunner.query(`
            UPDATE document_requirements 
            SET is_initial = 0 
            WHERE id = 'c9b9fe84-39ea-55cc-d9aa-f4f2g2797339'
        `);
        
        // Keep PSA Birth Certificate (b8a8fd73...) as it's still needed
        // Keep ALS Certificate (d0c0gf95...) as it's for alternative students
        
        console.log('✅ Cleaned up duplicate initial requirements');
        console.log('   - Disabled: Complete Grade 12 Report Card (replaced by separate First Sem + CoE)');
        console.log('   - Disabled: Certified First Sem Grade & CoE (replaced by separate requirements)');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore the old requirements if needed
        await queryRunner.query(`
            UPDATE document_requirements 
            SET is_initial = 1 
            WHERE id IN ('a997fc62-17c8-43aa-b788-d2e0f1575117', 'c9b9fe84-39ea-55cc-d9aa-f4f2g2797339')
        `);
    }
}
