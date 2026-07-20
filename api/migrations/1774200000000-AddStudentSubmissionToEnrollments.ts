import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dweezil's Code - Migration to add student submission tracking to enrollments
 * 
 * This migration adds columns to track when students submit their own enrollments,
 * allowing admins to distinguish between student-submitted and admin-created enrollments.
 * 
 * Changes:
 * 1. Add submittedByStudent column (boolean) - tracks if enrollment was submitted by student
 * 2. Add studentSubmissionDate column (timestamp) - records when student submitted
 * 
 * These fields are set automatically when students use the /enrollments/student/enroll endpoint.
 */
export class AddStudentSubmissionToEnrollments1774200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Starting migration: Add student submission tracking to enrollments');

    // Dweezil's Code - Check if columns already exist before adding
    const table = await queryRunner.getTable('enrollments');
    
    if (!table) {
      throw new Error('Enrollments table not found');
    }

    // Add submittedByStudent column if it doesn't exist
    const hasSubmittedByStudent = table.columns.find(col => col.name === 'submittedByStudent');
    if (!hasSubmittedByStudent) {
      console.log('📝 Adding submittedByStudent column...');
      await queryRunner.query(`
        ALTER TABLE enrollments 
        ADD COLUMN submittedByStudent TINYINT(1) NOT NULL DEFAULT 0 
        AFTER selectedSubjects
      `);
      console.log('✅ Added submittedByStudent column');
    } else {
      console.log('ℹ️ submittedByStudent column already exists, skipping');
    }

    // Add studentSubmissionDate column if it doesn't exist
    const hasStudentSubmissionDate = table.columns.find(col => col.name === 'studentSubmissionDate');
    if (!hasStudentSubmissionDate) {
      console.log('📝 Adding studentSubmissionDate column...');
      await queryRunner.query(`
        ALTER TABLE enrollments 
        ADD COLUMN studentSubmissionDate TIMESTAMP NULL 
        AFTER submittedByStudent
      `);
      console.log('✅ Added studentSubmissionDate column');
    } else {
      console.log('ℹ️ studentSubmissionDate column already exists, skipping');
    }

    console.log('✅ Migration completed: Add student submission tracking to enrollments');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Reverting migration: Add student submission tracking to enrollments');

    // Dweezil's Code - Check if columns exist before removing
    const table = await queryRunner.getTable('enrollments');
    
    if (!table) {
      console.warn('⚠️ Enrollments table not found, skipping revert');
      return;
    }

    // Remove studentSubmissionDate column if it exists
    const hasStudentSubmissionDate = table.columns.find(col => col.name === 'studentSubmissionDate');
    if (hasStudentSubmissionDate) {
      console.log('📝 Removing studentSubmissionDate column...');
      await queryRunner.query(`
        ALTER TABLE enrollments 
        DROP COLUMN studentSubmissionDate
      `);
      console.log('✅ Removed studentSubmissionDate column');
    } else {
      console.log('ℹ️ studentSubmissionDate column does not exist, skipping');
    }

    // Remove submittedByStudent column if it exists
    const hasSubmittedByStudent = table.columns.find(col => col.name === 'submittedByStudent');
    if (hasSubmittedByStudent) {
      console.log('📝 Removing submittedByStudent column...');
      await queryRunner.query(`
        ALTER TABLE enrollments 
        DROP COLUMN submittedByStudent
      `);
      console.log('✅ Removed submittedByStudent column');
    } else {
      console.log('ℹ️ submittedByStudent column does not exist, skipping');
    }

    console.log('✅ Migration reverted: Add student submission tracking to enrollments');
  }
}
