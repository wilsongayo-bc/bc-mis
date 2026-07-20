import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInitialRequirements1770100000000 implements MigrationInterface {
    name = 'AddInitialRequirements1770100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if these requirements already exist
        const existing = await queryRunner.query(`
            SELECT id FROM document_requirements 
            WHERE id IN ('bc0b899c-0180-4835-9c13-1f638f2c1b8d', 'bff481dd-7ddd-41ad-b4f3-c34033e72cb7')
        `);
        
        if (existing.length > 0) {
            console.log('Initial requirements already exist, skipping insert');
            return;
        }
        
        // Get a valid category ID from document_categories (use Academic Records or any available)
        const academicCategory = await queryRunner.query(`
            SELECT id FROM document_categories WHERE name = 'Academic Records' LIMIT 1
        `);
        
        const categoryId = academicCategory.length > 0 ? academicCategory[0].id : null;
        
        // Insert the two initial requirements for pre-registration
        await queryRunner.query(`
            INSERT INTO document_requirements (id, name, description, is_required, is_initial, category_id, validation_rules, applicable_grade_levels, created_at, updated_at)
            VALUES 
            (
                'bc0b899c-0180-4835-9c13-1f638f2c1b8d',
                'Photocopy of First Semester Report Card (S.Y. 2025–2026)',
                'First Semester Report Card for S.Y. 2025–2026',
                1,
                1,
                ${categoryId ? `'${categoryId}'` : 'NULL'},
                '{"maxFileSize": 5242880, "allowedFileTypes": ["image/jpeg", "image/png", "application/pdf"], "requiresVerification": false}',
                '["First Year", "Second Year", "Third Year", "Fourth Year"]',
                NOW(),
                NOW()
            ),
            (
                'bff481dd-7ddd-41ad-b4f3-c34033e72cb7',
                'Certificate of Enrollment (CoE) for Second Semester (S.Y. 2025–2026)',
                'Certificate of Enrollment (CoE) for the Second Semester of S.Y. 2025–2026',
                1,
                1,
                ${categoryId ? `'${categoryId}'` : 'NULL'},
                '{"maxFileSize": 5242880, "allowedFileTypes": ["image/jpeg", "image/png", "application/pdf"], "requiresVerification": false}',
                '["First Year", "Second Year", "Third Year", "Fourth Year"]',
                NOW(),
                NOW()
            )
        `);
        
        console.log('✅ Added initial requirements for pre-registration');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the initial requirements
        await queryRunner.query(`
            DELETE FROM document_requirements 
            WHERE id IN (
                'bc0b899c-0180-4835-9c13-1f638f2c1b8d',
                'bff481dd-7ddd-41ad-b4f3-c34033e72cb7'
            )
        `);
    }
}
