/**
 * Dweezil's Code
 * Script to fix student document requirements after migration
 * Updates all students to use the new document requirement IDs
 * Run with: npx ts-node scripts/fix-student-document-requirements.ts
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Student } from '../entities/Student';
import { DocumentRequirement } from '../entities/DocumentRequirement';

async function fixStudentDocumentRequirements() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const studentRepo = AppDataSource.getRepository(Student);
    const requirementRepo = AppDataSource.getRepository(DocumentRequirement);

    // Get all new requirements
    console.log('📋 Fetching new document requirements...');
    const newRequirements = await requirementRepo.find();
    console.log(`✅ Found ${newRequirements.length} requirements\n`);

    if (newRequirements.length === 0) {
      console.error('❌ No document requirements found. Please run migration first.');
      process.exit(1);
    }

    // Get all students
    console.log('👥 Fetching all students...');
    const students = await studentRepo.find();
    console.log(`✅ Found ${students.length} students\n`);

    if (students.length === 0) {
      console.log('ℹ️  No students to update.');
      process.exit(0);
    }

    // Update each student
    console.log('🔄 Updating student document requirements...\n');
    let updated = 0;
    let skipped = 0;

    for (const student of students) {
      try {
        // Clear old document requirements
        student.documentsRequired = [];
        student.documentsSubmitted = [];
        
        await studentRepo.save(student);
        console.log(`✅ Updated student: ${student.user?.firstName} ${student.user?.lastName} (${student.id})`);
        updated++;
      } catch (error) {
        console.error(`❌ Failed to update student ${student.id}:`, error);
        skipped++;
      }
    }

    console.log(`\n✅ Update completed!`);
    console.log(`   - Updated: ${updated} students`);
    console.log(`   - Skipped: ${skipped} students`);
    console.log(`\n📝 Note: Students will need to re-upload their documents with the new requirements.`);

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing student document requirements:', error);
    process.exit(1);
  }
}

// Run the fix
fixStudentDocumentRequirements();
