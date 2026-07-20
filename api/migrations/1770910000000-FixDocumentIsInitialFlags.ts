import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dweezil's Code - Task 3: Fix isInitial flags for existing student documents
 * 
 * This migration corrects the isInitial flag for documents that were uploaded
 * during student editing but incorrectly marked as initial requirements.
 * 
 * Strategy:
 * 1. Documents uploaded for PRE_REGISTERED students should have isInitial = true
 * 2. Documents uploaded for REGISTERED/ENROLLED students should have isInitial = false
 * 3. This ensures documents appear in the correct section (Initial Requirements vs Required Documents)
 */
export class FixDocumentIsInitialFlags1770910000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Starting migration: Fix isInitial flags for student documents');

    // Step 1: Set isInitial = true for documents belonging to PRE_REGISTERED students
    // These are documents uploaded during pre-registration
    const preRegResult = await queryRunner.query(`
      UPDATE student_documents sd
      INNER JOIN students s ON sd.student_id = s.id
      SET sd.is_initial = true
      WHERE s.registrationStatus = 'PRE_REGISTERED'
        AND sd.is_initial = false
    `);
    console.log(`✅ Updated ${preRegResult.affectedRows || 0} documents for PRE_REGISTERED students to isInitial = true`);

    // Step 2: Set isInitial = false for documents belonging to REGISTERED/ENROLLED students
    // These are documents uploaded during editing/full registration
    const registeredResult = await queryRunner.query(`
      UPDATE student_documents sd
      INNER JOIN students s ON sd.student_id = s.id
      SET sd.is_initial = false
      WHERE s.registrationStatus IN ('REGISTERED', 'FOR_ENROLLMENT', 'FOR_SCHEDULING', 'ENROLLED')
        AND sd.is_initial = true
        AND sd.requirement_id NOT IN (
          -- Exclude documents that are actually initial requirements
          SELECT id FROM document_requirements WHERE is_initial = true
        )
    `);
    console.log(`✅ Updated ${registeredResult.affectedRows || 0} documents for REGISTERED/ENROLLED students to isInitial = false`);

    console.log('✅ Migration completed: isInitial flags fixed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️ Rolling back migration: Fix isInitial flags');
    
    // Rollback: Set all documents' isInitial flag based on their requirement's isInitial flag
    await queryRunner.query(`
      UPDATE student_documents sd
      INNER JOIN document_requirements dr ON sd.requirement_id = dr.id
      SET sd.is_initial = dr.is_initial
    `);
    
    console.log('✅ Rollback completed: isInitial flags restored to requirement defaults');
  }
}
