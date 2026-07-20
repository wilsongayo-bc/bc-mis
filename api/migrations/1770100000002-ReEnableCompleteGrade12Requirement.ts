import { MigrationInterface, QueryRunner } from "typeorm";

export class ReEnableCompleteGrade12Requirement1770100000002 implements MigrationInterface {
    name = 'ReEnableCompleteGrade12Requirement1770100000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Re-enable the "Complete Grade 12 Report Card" requirement
        // This is needed for SHS graduates from previous school years
        await queryRunner.query(`
            UPDATE document_requirements 
            SET is_initial = 1 
            WHERE id = 'a997fc62-17c8-43aa-b788-d2e0f1575117'
        `);
        
        console.log('✅ Re-enabled Complete Grade 12 Report Card requirement');
        
        // Update ALS Certificate name to be more specific
        await queryRunner.query(`
            UPDATE document_requirements 
            SET 
                name = 'Photocopy of Certificate of Rating (COR) - SHS Level A&E Test',
                description = 'Certificate of Rating (COR) for Alternative Learning System (ALS) Senior High School Level A&E Test Passers'
            WHERE id = 'd0c0gf95-40fb-66dd-e0bb-g5g3h3808440'
        `);
        
        console.log('✅ Updated ALS Certificate name to Certificate of Rating (COR)');
        
        // Check if transferee requirements already exist
        const existing = await queryRunner.query(`
            SELECT id FROM document_requirements 
            WHERE id IN ('e1d1hg06-51gc-77ee-f1cc-h6h4i4919551', 'f2e2ih17-62hd-88ff-g2dd-i7i5j5020662')
        `);
        
        if (existing.length > 0) {
            console.log('Transferee requirements already exist, skipping insert');
            return;
        }
        
        // Get Academic Records category ID
        const academicCategory = await queryRunner.query(`
            SELECT id FROM document_categories WHERE name = 'Academic Records' LIMIT 1
        `);
        const academicCategoryId = academicCategory.length > 0 ? academicCategory[0].id : null;
        
        if (!academicCategoryId) {
            console.log('⚠️ Academic Records category not found, cannot add transferee requirements');
            return;
        }
        
        // Add missing initial requirements for Transferees/Returning Students
        await queryRunner.query(`
            INSERT INTO document_requirements (
                id, 
                name, 
                description, 
                is_required, 
                is_initial, 
                category_id, 
                validation_rules, 
                applicable_grade_levels, 
                created_at, 
                updated_at
            )
            VALUES 
            (
                'e1d1hg06-51gc-77ee-f1cc-h6h4i4919551',
                'Photocopy of Transcript of Records (TOR) or Informative Copy of Grades',
                'Transcript of Records (TOR) or Informative Copy of Grades for Transferees/Returning Students',
                1,
                1,
                '${academicCategoryId}',
                '{"maxFileSize": 5242880, "allowedFileTypes": ["image/jpeg", "image/png", "application/pdf"], "requiresVerification": false}',
                '["First Year", "Second Year", "Third Year", "Fourth Year"]',
                NOW(),
                NOW()
            ),
            (
                'f2e2ih17-62hd-88ff-g2dd-i7i5j5020662',
                'Certificate of Transfer Credential / Honorable Dismissal',
                'Certificate of Transfer Credential or Honorable Dismissal for Transferees/Returning Students',
                1,
                1,
                '${academicCategoryId}',
                '{"maxFileSize": 5242880, "allowedFileTypes": ["image/jpeg", "image/png", "application/pdf"], "requiresVerification": false}',
                '["First Year", "Second Year", "Third Year", "Fourth Year"]',
                NOW(),
                NOW()
            )
        `);
        
        console.log('✅ Added initial requirements for Transferees/Returning Students');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Disable Complete Grade 12 Report Card again
        await queryRunner.query(`
            UPDATE document_requirements 
            SET is_initial = 0 
            WHERE id = 'a997fc62-17c8-43aa-b788-d2e0f1575117'
        `);
        
        // Revert ALS Certificate name
        await queryRunner.query(`
            UPDATE document_requirements 
            SET 
                name = 'Photocopy of ALS Certificate',
                description = 'Alternative Learning System Certification'
            WHERE id = 'd0c0gf95-40fb-66dd-e0bb-g5g3h3808440'
        `);
        
        // Remove transferee requirements
        await queryRunner.query(`
            DELETE FROM document_requirements 
            WHERE id IN (
                'e1d1hg06-51gc-77ee-f1cc-h6h4i4919551',
                'f2e2ih17-62hd-88ff-g2dd-i7i5j5020662'
            )
        `);
    }
}
