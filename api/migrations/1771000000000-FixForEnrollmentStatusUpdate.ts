import { MigrationInterface, QueryRunner } from 'typeorm';

// Dweezil's Code
export class FixForEnrollmentStatusUpdate1771000000000 implements MigrationInterface {
  name = 'FixForEnrollmentStatusUpdate1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Running migration: FixForEnrollmentStatusUpdate');
    
    // Ensure the registrationStatus enum includes all required values
    await queryRunner.query(`
      ALTER TABLE students 
      MODIFY COLUMN registrationStatus 
      ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED', 'FOR_ENROLLMENT', 'FOR_SCHEDULING', 'ENROLLED') 
      DEFAULT 'PRE_REGISTERED'
    `);
    console.log('✅ Updated registrationStatus enum');
    
    // Dweezil's Code - Add index on registrationStatus for better query performance
    // Check if index exists before creating (MySQL doesn't support IF NOT EXISTS for indexes)
    const registrationStatusIndexExists = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'students' 
      AND index_name = 'idx_students_registration_status'
    `);
    
    if (registrationStatusIndexExists[0].count === 0) {
      await queryRunner.query(`
        CREATE INDEX idx_students_registration_status 
        ON students(registrationStatus)
      `);
      console.log('✅ Added index on registrationStatus');
    } else {
      console.log('ℹ️ Index idx_students_registration_status already exists');
    }
    
    // Dweezil's Code - Add index on student_documents for better query performance
    const studentDocumentsStudentIdIndexExists = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'student_documents' 
      AND index_name = 'idx_student_documents_student_id'
    `);
    
    if (studentDocumentsStudentIdIndexExists[0].count === 0) {
      await queryRunner.query(`
        CREATE INDEX idx_student_documents_student_id 
        ON student_documents(student_id)
      `);
      console.log('✅ Added index on student_documents.student_id');
    } else {
      console.log('ℹ️ Index idx_student_documents_student_id already exists');
    }
    
    // Dweezil's Code - Add index on student_documents requirement_id
    const studentDocumentsRequirementIdIndexExists = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'student_documents' 
      AND index_name = 'idx_student_documents_requirement_id'
    `);
    
    if (studentDocumentsRequirementIdIndexExists[0].count === 0) {
      await queryRunner.query(`
        CREATE INDEX idx_student_documents_requirement_id 
        ON student_documents(requirement_id)
      `);
      console.log('✅ Added index on student_documents.requirement_id');
    } else {
      console.log('ℹ️ Index idx_student_documents_requirement_id already exists');
    }
    
    console.log('✅ Migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Reverting migration: FixForEnrollmentStatusUpdate');
    
    // Dweezil's Code - Remove indexes (check if they exist first)
    const requirementIdIndexExists = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'student_documents' 
      AND index_name = 'idx_student_documents_requirement_id'
    `);
    
    if (requirementIdIndexExists[0].count > 0) {
      await queryRunner.query(`
        DROP INDEX idx_student_documents_requirement_id ON student_documents
      `);
      console.log('✅ Removed index idx_student_documents_requirement_id');
    }
    
    const studentIdIndexExists = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'student_documents' 
      AND index_name = 'idx_student_documents_student_id'
    `);
    
    if (studentIdIndexExists[0].count > 0) {
      await queryRunner.query(`
        DROP INDEX idx_student_documents_student_id ON student_documents
      `);
      console.log('✅ Removed index idx_student_documents_student_id');
    }
    
    const registrationStatusIndexExists = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'students' 
      AND index_name = 'idx_students_registration_status'
    `);
    
    if (registrationStatusIndexExists[0].count > 0) {
      await queryRunner.query(`
        DROP INDEX idx_students_registration_status ON students
      `);
      console.log('✅ Removed index idx_students_registration_status');
    }
    
    // Revert enum (remove ENROLLED)
    await queryRunner.query(`
      ALTER TABLE students 
      MODIFY COLUMN registrationStatus 
      ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED', 'FOR_ENROLLMENT', 'FOR_SCHEDULING') 
      DEFAULT 'PRE_REGISTERED'
    `);
    
    console.log('✅ Migration reverted successfully');
  }
}
