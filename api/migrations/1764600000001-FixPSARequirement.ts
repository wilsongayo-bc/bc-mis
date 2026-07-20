import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPSARequirement1764600000001 implements MigrationInterface {
    name = 'FixPSARequirement1764600000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update PSA Birth Certificate requirement to not be initial and not required
        // This ensures it doesn't appear in the public pre-listing form
        await queryRunner.query(`
            UPDATE document_requirements
            SET is_initial = false, is_required = false
            WHERE name LIKE '%PSA Birth Certificate%'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes (make it initial and required again)
        await queryRunner.query(`
            UPDATE document_requirements
            SET is_initial = true, is_required = true
            WHERE name LIKE '%PSA Birth Certificate%'
        `);
    }
}
