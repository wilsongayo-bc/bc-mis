import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dweezil's Code - Migration to fix duplicate document requirement names
 * 
 * This migration addresses the issue where multiple requirements have the same name
 * but different IDs, causing documents to appear as duplicates in the UI.
 * 
 * Changes:
 * 1. Rename duplicate requirements to make them unique
 * 2. Add a composite unique index to prevent future duplicates
 * 
 * The unique constraint is on (name, categoryId, isInitial) to allow:
 * - Same name in different categories
 * - Same name with different isInitial flags
 * But prevent exact duplicates within the same category and initial status.
 */
export class FixDuplicateRequirementNames1774100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Starting migration: Fix duplicate document requirement names');

    // Dweezil's Code - Step 1: Rename the duplicate "Photocopy of Certificate of Rating (COR) - SHS Level A&E Test"
    // There are two requirements with this name:
    // 1. ID: d0c09f95-40fb-66dd-e0bb-959383808440 (For ALS students, isInitial: true)
    // 2. ID: 14b86acd-9cc7-4783-beed-08519f257db1 (For Grade 12 students, isInitial: false)
    
    console.log('📝 Renaming duplicate requirements to make them unique...');
    
    // Rename the ALS requirement to be more specific
    await queryRunner.query(`
      UPDATE document_requirements 
      SET 
        name = 'Photocopy of Certificate of Rating (COR) - ALS SHS Level A&E Test',
        description = 'Certificate of Rating (COR) for Alternative Learning System (ALS) Senior High School Level A&E Test Passers'
      WHERE id = 'd0c09f95-40fb-66dd-e0bb-959383808440'
    `);
    console.log('✅ Renamed ALS requirement');

    // Rename the Grade 12 requirement to be more specific
    await queryRunner.query(`
      UPDATE document_requirements 
      SET 
        name = 'Photocopy of Certificate of Rating (COR) - Grade 12 SHS Level A&E Test',
        description = 'Certificate of Rating (COR) for currently enrolled Grade 12 (SHS) students'
      WHERE id = '14b86acd-9cc7-4783-beed-08519f257db1'
    `);
    console.log('✅ Renamed Grade 12 requirement');

    // Dweezil's Code - Step 2: Check for any other duplicate names
    console.log('🔍 Checking for other duplicate requirement names...');
    
    const duplicates = await queryRunner.query(`
      SELECT 
        name, 
        category_id, 
        is_initial, 
        COUNT(*) as count,
        GROUP_CONCAT(id) as ids
      FROM document_requirements
      GROUP BY name, category_id, is_initial
      HAVING COUNT(*) > 1
    `);

    if (duplicates && duplicates.length > 0) {
      console.warn('⚠️ Found additional duplicate requirements:', duplicates);
      console.warn('⚠️ Please manually review and rename these requirements');
      
      // Log details for manual review
      for (const dup of duplicates) {
        console.warn(`   - Name: "${dup.name}", Category: ${dup.category_id}, IsInitial: ${dup.is_initial}, Count: ${dup.count}`);
        console.warn(`     IDs: ${dup.ids}`);
      }
    } else {
      console.log('✅ No other duplicate requirements found');
    }

    // Dweezil's Code - Step 3: Add composite unique index to prevent future duplicates
    // This ensures that within the same category and isInitial status, requirement names must be unique
    console.log('🔒 Adding unique constraint to prevent future duplicates...');
    
    try {
      // First, check if the index already exists
      const indexExists = await queryRunner.query(`
        SELECT COUNT(*) as count
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'document_requirements'
          AND index_name = 'idx_unique_requirement_name'
      `);

      const indexCount = Number(indexExists?.[0]?.count ?? 0);
      if (indexCount === 0) {
        await queryRunner.query(`
          CREATE UNIQUE INDEX idx_unique_requirement_name 
          ON document_requirements (name, category_id, is_initial)
        `);
        console.log('✅ Unique constraint added successfully');
      } else {
        console.log('ℹ️ Unique constraint already exists, skipping');
      }
    } catch (error) {
      console.error('❌ Error adding unique constraint:', error);
      console.warn('⚠️ Continuing migration despite constraint error');
      // Don't throw - allow migration to complete even if constraint fails
    }

    console.log('✅ Migration completed: Fix duplicate document requirement names');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Reverting migration: Fix duplicate document requirement names');

    // Dweezil's Code - Step 1: Remove the unique constraint
    console.log('🔓 Removing unique constraint...');
    
    try {
      await queryRunner.query(`
        DROP INDEX idx_unique_requirement_name ON document_requirements
      `);
      console.log('✅ Unique constraint removed');
    } catch (error) {
      console.warn('⚠️ Could not remove unique constraint (may not exist):', error);
    }

    // Dweezil's Code - Step 2: Revert the name changes (optional - may not be desired)
    console.log('📝 Reverting requirement name changes...');
    
    // Revert ALS requirement name
    await queryRunner.query(`
      UPDATE document_requirements 
      SET 
        name = 'Photocopy of Certificate of Rating (COR) - SHS Level A&E Test',
        description = 'Certificate of Rating (COR) for the Senior High School (SHS) level of the Accreditation and Equivalency (A&E) Test'
      WHERE id = 'd0c09f95-40fb-66dd-e0bb-959383808440'
    `);
    console.log('✅ Reverted ALS requirement name');

    // Revert Grade 12 requirement name
    await queryRunner.query(`
      UPDATE document_requirements 
      SET 
        name = 'Photocopy of Certificate of Rating (COR) - SHS Level A&E Test',
        description = 'Certificate of Rating (COR) for the Senior High School (SHS) level of the Accreditation and Equivalency (A&E) Test'
      WHERE id = '14b86acd-9cc7-4783-beed-08519f257db1'
    `);
    console.log('✅ Reverted Grade 12 requirement name');

    console.log('✅ Migration reverted: Fix duplicate document requirement names');
  }
}
