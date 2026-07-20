import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateDocumentRequirements1764400000000 implements MigrationInterface {
    name = 'UpdateDocumentRequirements1764400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add is_initial column if it doesn't exist
        const hasColumn = await queryRunner.hasColumn('document_requirements', 'is_initial');
        if (!hasColumn) {
            await queryRunner.query(`
                ALTER TABLE \`document_requirements\` 
                ADD \`is_initial\` tinyint NOT NULL DEFAULT 0
            `);
            console.log('✅ Added is_initial column to document_requirements');
        } else {
            console.log('is_initial column already exists');
        }

        // Check if initial requirements already exist
        const existingInitial = await queryRunner.query(`
            SELECT COUNT(*) as count FROM \`document_requirements\` WHERE is_initial = 1
        `);
        
        if (existingInitial[0].count > 0) {
            console.log('Initial requirements already exist, skipping insert');
            return;
        }

        // Get category IDs from document_categories table
        const academicCategory = await queryRunner.query(`
            SELECT id FROM \`document_categories\` WHERE name = 'Academic Records' LIMIT 1
        `);
        const legalCategory = await queryRunner.query(`
            SELECT id FROM \`document_categories\` WHERE name = 'Legal Documents' LIMIT 1
        `);
        
        const academicCategoryId = academicCategory.length > 0 ? academicCategory[0].id : null;
        const legalCategoryId = legalCategory.length > 0 ? legalCategory[0].id : null;

        // Dweezil's Code - Issue #4: Insert initial requirements with fixed IDs
        // These IDs match what the frontend expects
        await queryRunner.query(`
            INSERT INTO \`document_requirements\` (id, name, description, is_required, is_initial, category_id, validation_rules, created_at, updated_at) VALUES
            ('a997fc62-17c8-43aa-b788-d2e0f1575117', 'Photocopy of Complete Grade 12 Report Card (First & Second Semesters)', 'Complete Grade 12 (SHS) Report Card for both the First and Second Semesters', 1, 1, ${academicCategoryId ? `'${academicCategoryId}'` : 'NULL'}, '{"maxFileSize":10485760,"allowedFileTypes":["image/jpeg","image/png","application/pdf"]}', NOW(), NOW()),
            ('b8a8fd73-28d9-44bb-c899-e3e1f1686228', 'Photocopy of PSA Birth Certificate', 'Provide a photocopy of PSA-issued birth certificate', 1, 1, ${legalCategoryId ? `'${legalCategoryId}'` : 'NULL'}, '{"maxFileSize":10485760,"allowedFileTypes":["image/jpeg","image/png","application/pdf"]}', NOW(), NOW()),
            ('c9b9fe84-39ea-55cc-d9aa-f4f2g2797339', 'Certified First Sem Grade & CoE for Second Sem (Fresh 2025-2026)', 'Incoming college freshmen AY 2025-2026: certified copy of first semester grade and certificate of enrollment (CoE) for second semester', 1, 1, ${academicCategoryId ? `'${academicCategoryId}'` : 'NULL'}, '{"maxFileSize":10485760,"allowedFileTypes":["image/jpeg","image/png","application/pdf"]}', NOW(), NOW()),
            ('d0c0gf95-40fb-66dd-e0bb-g5g3h3808440', 'Photocopy of ALS Certificate', 'Alternative Learning System Certification', 1, 1, ${academicCategoryId ? `'${academicCategoryId}'` : 'NULL'}, '{"maxFileSize":10485760,"allowedFileTypes":["image/jpeg","image/png","application/pdf"]}', NOW(), NOW())
        `);
        
        console.log('✅ Inserted initial document requirements');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn('document_requirements', 'is_initial');
        if (hasColumn) {
            await queryRunner.query(`ALTER TABLE \`document_requirements\` DROP COLUMN \`is_initial\``);
        }
    }
}
