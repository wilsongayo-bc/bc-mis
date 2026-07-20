// Dweezil's Code - Create course section for BTVTED-CP
// This script creates an active course section to fix the course display issue

import { AppDataSource } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

async function createBTVTEDSection() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const courseId = '8885e361-014d-11f1-969e-507b9d85c6a3';
    const sectionId = uuidv4();

    console.log('\n📝 Creating course section...');
    console.log('Course ID:', courseId);
    console.log('Section ID:', sectionId);
    console.log('Section Name: A');
    console.log('Year Level: Fourth Year');
    console.log('Academic Year: 2025-2026');
    console.log('Semester: First Semester');
    console.log('Max Students: 40');
    console.log('Credits: 3');
    console.log('Is Active: TRUE');

    // Check if section already exists
    const existingSections = await AppDataSource.query(
      'SELECT id, sectionName, yearLevel FROM course_sections WHERE courseId = ?',
      [courseId]
    );

    if (existingSections.length > 0) {
      console.log('\n⚠️  Course sections already exist for BTVTED-CP:');
      console.log(JSON.stringify(existingSections, null, 2));
      console.log('\n❓ Do you want to create another section? (The script will continue)');
    }

    // Insert the course section
    await AppDataSource.query(
      `INSERT INTO course_sections (
        id,
        courseId,
        yearLevel,
        sectionName,
        credits,
        maxStudents,
        semester,
        academicYear,
        isActive,
        createdAt,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        sectionId,
        courseId,
        'Fourth Year',
        'A',
        3,
        40,
        'First Semester',
        '2025-2026',
        1
      ]
    );

    console.log('\n✅ Course section created successfully!');

    // Verify the section was created
    const verifySection = await AppDataSource.query(
      `SELECT 
        id,
        sectionName,
        courseId,
        yearLevel,
        isActive,
        academicYear,
        semester,
        maxStudents,
        credits
      FROM course_sections 
      WHERE id = ?`,
      [sectionId]
    );

    console.log('\n📊 Verification - Section Details:');
    console.log(JSON.stringify(verifySection, null, 2));

    // Show all sections for this course
    const allSections = await AppDataSource.query(
      `SELECT 
        id,
        sectionName,
        yearLevel,
        isActive,
        academicYear,
        semester
      FROM course_sections 
      WHERE courseId = ?`,
      [courseId]
    );

    console.log('\n📚 All sections for BTVTED-CP:');
    console.log(JSON.stringify(allSections, null, 2));

    console.log('\n✅ SUCCESS! Course section is ready.');
    console.log('\n📋 Next Steps:');
    console.log('1. Edit the student record');
    console.log('2. Select BTVTED-CP course');
    console.log('3. Save the student');
    console.log('4. View student details - course should now display');

    await AppDataSource.destroy();
    console.log('\n🔌 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error creating course section:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    
    process.exit(1);
  }
}

// Run the script
createBTVTEDSection();
