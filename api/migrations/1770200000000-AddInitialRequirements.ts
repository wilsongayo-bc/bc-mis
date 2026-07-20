import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInitialRequirements1770200000000 implements MigrationInterface {
    name = 'AddInitialRequirements1770200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔄 Adding missing initial requirements for pre-registration...');
        
        // Check which requirements already exist
        const existing = await queryRunner.query(`
            SELECT id FROM document_requirements 
            WHERE id IN (
                'bc0b899c-0180-4835-9c13-1f638f2c1b8d',
                'bff481dd-7ddd-41ad-b4f3-c34033e72cb7',
                'a997fc62-17c8-43aa-b788-d2e0f1575117',
                'd0c09f95-40fb-66dd-e0bb-959383808440',
                'e1d1a906-51ac-77ee-f1cc-a6a494919551',
                'f2e2a917-62ad-88ff-f2dd-a7a595020662'
            )
        `);
        
        const existingIds = new Set(existing.map((row: { id: string }) => row.id));
        console.log(`📋 Found ${existingIds.size} existing requirements`);
        
        // Define all 6 initial requirements
        const requirements = [
            {
                id: 'bc0b899c-0180-4835-9c13-1f638f2c1b8d',
                name: 'Photocopy of First Semester Report Card (S.Y. 2025–2026)',
                description: 'First semester report card for currently enrolled Grade 12 students',
                isRequired: 1
            },
            {
                id: 'bff481dd-7ddd-41ad-b4f3-c34033e72cb7',
                name: 'Certificate of Enrollment (CoE) for Second Semester (S.Y. 2025–2026)',
                description: 'Certificate of Enrollment for second semester',
                isRequired: 1
            },
            {
                id: 'a997fc62-17c8-43aa-b788-d2e0f1575117',
                name: 'Photocopy of Complete Grade 12 Report Card (First & Second Semesters)',
                description: 'Complete Grade 12 report card for both semesters',
                isRequired: 1
            },
            {
                id: 'd0c09f95-40fb-66dd-e0bb-959383808440',
                name: 'Photocopy of Certificate of Rating (COR) - SHS Level A&E Test',
                description: 'Certificate of Rating (COR) for the Senior High School (SHS) level of the Accreditation and Equivalency (A&E) Test',
                isRequired: 1
            },
            {
                id: 'e1d1a906-51ac-77ee-f1cc-a6a494919551',
                name: 'Photocopy of Transcript of Records (TOR) or Informative Copy of Grades',
                description: 'Transcript of Records (TOR) or Informative Copy of Grades from previous school',
                isRequired: 1
            },
            {
                id: 'f2e2a917-62ad-88ff-f2dd-a7a595020662',
                name: 'Certificate of Transfer Credential / Honorable Dismissal',
                description: 'Certificate of Transfer Credential or Honorable Dismissal from previous school',
                isRequired: 0
            }
        ];
        
        // Insert only missing requirements
        let insertedCount = 0;
        for (const req of requirements) {
            if (!existingIds.has(req.id)) {
                await queryRunner.query(`
                    INSERT INTO document_requirements (id, name, description, is_required, is_initial, category_id, created_at, updated_at)
                    VALUES (
                        '${req.id}',
                        '${req.name}',
                        '${req.description}',
                        ${req.isRequired},
                        1,
                        NULL,
                        NOW(),
                        NOW()
                    )
                `);
                insertedCount++;
                console.log(`✅ Inserted: ${req.name}`);
            } else {
                console.log(`⏭️  Skipped (already exists): ${req.name}`);
            }
        }
        
        console.log(`✅ Migration complete. Inserted ${insertedCount} new requirements.`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the initial requirements
        await queryRunner.query(`
            DELETE FROM document_requirements
            WHERE id IN (
                'bc0b899c-0180-4835-9c13-1f638f2c1b8d',
                'bff481dd-7ddd-41ad-b4f3-c34033e72cb7',
                'a997fc62-17c8-43aa-b788-d2e0f1575117',
                'd0c09f95-40fb-66dd-e0bb-959383808440',
                'e1d1a906-51ac-77ee-f1cc-a6a494919551',
                'f2e2a917-62ad-88ff-f2dd-a7a595020662'
            )
        `);
    }
}
