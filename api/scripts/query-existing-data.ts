
import { AppDataSource, initializeDatabase, closeDatabase } from '../config/database';
import { Department } from '../entities/Department';
import { Position } from '../entities/Position';
import { Course } from '../entities/Course';
import { Subject } from '../entities/Subject';
import { SubjectPrerequisite } from '../entities/SubjectPrerequisite';
import { Book } from '../entities/Book';

/**
 * Query existing data from the database
 */
export async function queryExistingData() {
  try {
    console.log('🔍 Querying existing database data...');
    
    // Initialize database connection
    await initializeDatabase();
    console.log('✅ Database connection established');

    // Query all existing data
    const departments = await AppDataSource.getRepository(Department).find({
      where: { isActive: true },
      order: { name: 'ASC' }
    });

    const positions = await AppDataSource.getRepository(Position).find({
      where: { isActive: true },
      order: { name: 'ASC' }
    });

    const courses = await AppDataSource.getRepository(Course).find({
      where: { isActive: true },
      relations: ['department'],
      order: { courseCode: 'ASC' }
    });

    const subjects = await AppDataSource.getRepository(Subject).find({
      where: { isActive: true },
      relations: ['department'],
      order: { code: 'ASC' }
    });

    const prerequisites = await AppDataSource.getRepository(SubjectPrerequisite).find({
      relations: ['subject', 'prerequisiteSubject']
    });

    const booksCount = await AppDataSource.getRepository(Book).count();
    const books = await AppDataSource.getRepository(Book).find({
      take: 10,
      order: { createdAt: 'DESC' }
    });

    // Log the results
    console.log('\n📊 EXISTING DATA SUMMARY:');
    console.log(`🏢 Departments: ${departments.length}`);
    console.log(`👔 Positions: ${positions.length}`);
    console.log(`📚 Courses: ${courses.length}`);
    console.log(`📖 Subjects: ${subjects.length}`);
    console.log(`🔗 Prerequisites: ${prerequisites.length}`);
    console.log(`📘 Books: ${booksCount}`);

    // Display detailed data
    if (departments.length > 0) {
      console.log('\n🏢 DEPARTMENTS:');
      departments.forEach(dept => {
        console.log(`  - ${dept.code}: ${dept.name}`);
      });
    }

    if (positions.length > 0) {
      console.log('\n👔 POSITIONS:');
      positions.forEach(pos => {
        console.log(`  - ${pos.name}`);
      });
    }

    if (courses.length > 0) {
      console.log('\n📚 COURSES:');
      courses.forEach(course => {
        console.log(`  - ${course.courseCode}: ${course.name} (${course.department?.code || 'No Dept'})`);
      });
    }

    if (subjects.length > 0) {
      console.log('\n📖 SUBJECTS:');
      subjects.forEach(subject => {
        console.log(`  - ${subject.code}: ${subject.name} (${subject.units} units, ${subject.department?.code || 'No Dept'})`);
      });
    }

    if (prerequisites.length > 0) {
      console.log('\n🔗 PREREQUISITES:');
      prerequisites.forEach(prereq => {
        console.log(`  - ${prereq.prerequisiteSubject?.code} → ${prereq.subject?.code}`);
      });
    }
    
    if (books.length > 0) {
        console.log('\n📘 RECENT BOOKS:');
        books.forEach(book => {
            console.log(`  - ${book.title} (ISBN: ${book.isbn})`);
        });
    }

    return {
      departments,
      positions,
      courses,
      subjects,
      prerequisites,
      booksCount
    };

  } catch (error) {
    console.error('❌ Error querying existing data:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

// Execute if run directly
if (require.main === module) {
  queryExistingData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
