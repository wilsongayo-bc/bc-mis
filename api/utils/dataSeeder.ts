/**
 * Comprehensive Seed Data Script
 * Inserts all default data for the Benedict College MIS system
 * Combines data from all existing SQL files into a unified TypeScript approach
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { Department } from '../entities/Department';
import { Position } from '../entities/Position';
import { Subject } from '../entities/Subject';
import { Course } from '../entities/Course';
import { GradeLevel } from '../entities/GradeLevel';
// Removed unused imports from Student entity to satisfy lint
import { Settings } from '../entities/Settings';
import { DocumentCategory, DocumentRequirement } from '../entities';
import bcrypt from 'bcrypt';

const DEFAULT_DOCUMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;

interface SeedResult {
  entity: string;
  created: number;
  skipped: number;
  errors: string[];
}

class DataSeeder {
  private results: SeedResult[] = [];

  private logResult(entity: string, created: number, skipped: number, errors: string[] = []) {
    this.results.push({ entity, created, skipped, errors });
    console.log(`✅ ${entity}: ${created} created, ${skipped} skipped${errors.length > 0 ? `, ${errors.length} errors` : ''}`);
  }

  async seedDepartments() {
    const departmentRepo = AppDataSource.getRepository(Department);
    let created = 0, skipped = 0;
    const errors: string[] = [];

    const departments = [
      {
        name: 'Computer Studies',
        code: 'CS',
        description: 'Department of Computer Studies and Information Technology',
        isActive: true
      },
      {
        name: 'Education',
        code: 'EDUC',
        description: 'Department of Education and Teacher Training',
        isActive: true
      },
      {
        name: 'Business Administration',
        code: 'BA',
        description: 'Department of Business Administration and Management',
        isActive: true
      },
      {
        name: 'Liberal Arts',
        code: 'LA',
        description: 'Department of Liberal Arts and Sciences',
        isActive: true
      }
    ];

    for (const deptData of departments) {
      try {
        const existing = await departmentRepo.findOne({ where: { code: deptData.code } });
        if (existing) {
          skipped++;
          continue;
        }

        const department = departmentRepo.create(deptData);
        await departmentRepo.save(department);
        created++;
      } catch (error) {
        errors.push(`Failed to create department ${deptData.name}: ${error}`);
      }
    }

    this.logResult('Departments', created, skipped, errors);
  }

  async seedPositions() {
    const positionRepo = AppDataSource.getRepository(Position);
    let created = 0, skipped = 0;
    const errors: string[] = [];

    const positions = [
      { name: 'Super Administrator', description: 'System Super Administrator with full access' },
      { name: 'System Administrator', description: 'System Administrator with administrative privileges' },
      { name: 'College President', description: 'College President and Chief Executive' },
      { name: 'Associate Professor I', description: 'Associate Professor Level I' },
      { name: 'Associate Professor II', description: 'Associate Professor Level II' },
      { name: 'Assistant Professor I', description: 'Assistant Professor Level I' },
      { name: 'Assistant Professor II', description: 'Assistant Professor Level II' },
      { name: 'Instructor I', description: 'Instructor Level I' },
      { name: 'Instructor II', description: 'Instructor Level II' },
      { name: 'Instructor III', description: 'Instructor Level III' },
      { name: 'Registrar I', description: 'Registrar Level I' },
      { name: 'Registrar II', description: 'Registrar Level II' },
      { name: 'Librarian I', description: 'Librarian Level I' },
      { name: 'Librarian II', description: 'Librarian Level II' },
      { name: 'Nurse I', description: 'Nurse Level I' },
      { name: 'HR Assistant', description: 'Human Resources Assistant' },
      { name: 'Admin Aide I', description: 'Administrative Aide Level I' },
      { name: 'Admin Aide II', description: 'Administrative Aide Level II' },
      { name: 'Admin Aide III', description: 'Administrative Aide Level III' },
      { name: 'Professor', description: 'Full Professor' }
    ];

    for (const posData of positions) {
      try {
        const existing = await positionRepo.findOne({ where: { name: posData.name } });
        if (existing) {
          skipped++;
          continue;
        }

        const position = positionRepo.create({ ...posData, isActive: true });
        await positionRepo.save(position);
        created++;
      } catch (error) {
        errors.push(`Failed to create position ${posData.name}: ${error}`);
      }
    }

    this.logResult('Positions', created, skipped, errors);
  }

  async seedUsers() {
    const userRepo = AppDataSource.getRepository(User);
    let created = 0, skipped = 0;
    const errors: string[] = [];

    // Default admin users
    const adminUsers = [
      {
        email: 'super@benedictcollege.com',
        username: 'superadmin',
        password: 'SuperAdmin123!',
        firstName: 'WILSON',
        lastName: 'GAYO',
        position: 'Super Administrator',
        role: UserRole.SUPERADMIN
      },
      {
        email: 'admin@benedictcollege.edu',
        username: 'admin',
        password: 'admin123',
        firstName: 'SYSTEM',
        lastName: 'ADMIN',
        position: 'Administrator',
        role: UserRole.ADMIN
      }
    ];

    // Default staff users from init-users.ts
    const staffUsers = [
      {
        lastName: 'ALVAREZ',
        firstName: 'MA. OLGA',
        username: 'malvarez',
        email: 'malvarez@benedictcollege.com',
        position: 'Administrator',
        role: UserRole.ADMIN,
        password: 'malvarez123'
      },
      {
        lastName: 'GUMOLON',
        firstName: 'PREACIOUS',
        username: 'pgumolon',
        email: 'pgumolon@benedictcollege.com',
        position: 'Professor',
        role: UserRole.TEACHER,
        password: 'pgumolon123'
      },
      {
        lastName: 'BETOS',
        firstName: 'SARAH',
        username: 'sbetos',
        email: 'sbetos@benedictcollege.com',
        position: 'Professor',
        role: UserRole.TEACHER,
        password: 'sbetos123'
      },
      {
        lastName: 'YAMILO',
        firstName: 'LENY',
        username: 'lyamilo',
        email: 'lyamilo@benedictcollege.com',
        position: 'Registrar I',
        role: UserRole.REGISTRAR,
        password: 'lyamilo123'
      },
      {
        lastName: 'LAPA',
        firstName: 'MAY GRACE',
        username: 'mlapa',
        email: 'mlapa@benedictcollege.com',
        position: 'Librarian I',
        role: UserRole.LIBRARIAN,
        password: 'mlapa123'
      },
      {
        lastName: 'LAMBUNAO',
        firstName: 'SHERIEHANE',
        username: 'slambunao',
        email: 'slambunao@benedictcollege.com',
        position: 'HR Assistant',
        role: UserRole.STAFF,
        password: 'slambunao123'
      },
      {
        lastName: 'LABASBAS',
        firstName: 'AILEEN',
        username: 'alabasbas',
        email: 'alabasbas@benedictcollege.com',
        position: 'Admin Aide I',
        role: UserRole.STAFF,
        password: 'lyamilo123'
      }
    ];

    // Additional teacher users for employee seeding
    const teacherUsers = [
      {
        email: 'prof.garcia@benedictcollege.edu.ph',
        username: 'prof.garcia',
        password: 'Garcia123!',
        firstName: 'MARIA',
        lastName: 'GARCIA',
        position: 'Associate Professor I',
        role: UserRole.TEACHER
      },
      {
        email: 'prof.santos@benedictcollege.edu.ph',
        username: 'prof.santos',
        password: 'Santos123!',
        firstName: 'JUAN',
        lastName: 'SANTOS',
        position: 'Assistant Professor I',
        role: UserRole.TEACHER
      },
      {
        email: 'prof.reyes@benedictcollege.edu.ph',
        username: 'prof.reyes',
        password: 'Reyes123!',
        firstName: 'ANA',
        lastName: 'REYES',
        position: 'Associate Professor II',
        role: UserRole.TEACHER
      },
      {
        email: 'prof.mendoza@benedictcollege.edu.ph',
        username: 'prof.mendoza',
        password: 'Mendoza123!',
        firstName: 'CARLOS',
        lastName: 'MENDOZA',
        position: 'Instructor I',
        role: UserRole.TEACHER
      },
      {
        email: 'prof.flores@benedictcollege.edu.ph',
        username: 'prof.flores',
        password: 'Flores123!',
        firstName: 'ROSA',
        lastName: 'FLORES',
        position: 'Assistant Professor II',
        role: UserRole.TEACHER
      }
    ];

    // Student users for student seeding
    const studentUsers = [
      {
        email: 'juan.cruz@student.benedictcollege.edu.ph',
        username: 'juan.cruz',
        password: 'Student123!',
        firstName: 'JUAN',
        lastName: 'CRUZ',
        position: 'Student',
        role: UserRole.STUDENT
      },
      {
        email: 'maria.santos@student.benedictcollege.edu.ph',
        username: 'maria.santos',
        password: 'Student123!',
        firstName: 'MARIA',
        lastName: 'SANTOS',
        position: 'Student',
        role: UserRole.STUDENT
      },
      {
        email: 'carlos.reyes@student.benedictcollege.edu.ph',
        username: 'carlos.reyes',
        password: 'Student123!',
        firstName: 'CARLOS',
        lastName: 'REYES',
        position: 'Student',
        role: UserRole.STUDENT
      },
      {
        email: 'sofia.mendoza@student.benedictcollege.edu.ph',
        username: 'sofia.mendoza',
        password: 'Student123!',
        firstName: 'SOFIA',
        lastName: 'MENDOZA',
        position: 'Student',
        role: UserRole.STUDENT
      },
      {
        email: 'diego.flores@student.benedictcollege.edu.ph',
        username: 'diego.flores',
        password: 'Student123!',
        firstName: 'DIEGO',
        lastName: 'FLORES',
        position: 'Student',
        role: UserRole.STUDENT
      }
    ];

    const allUsers = [...adminUsers, ...staffUsers, ...teacherUsers, ...studentUsers];

    for (const userData of allUsers) {
      try {
        const existing = await userRepo.findOne({ where: [{ email: userData.email }, { username: userData.username }] });
        if (existing) {
          skipped++;
          continue;
        }

        const hashedPassword = await bcrypt.hash(userData.password, 12);
        const user = userRepo.create({
          ...userData,
          password: hashedPassword,
          isActive: true
        });
        await userRepo.save(user);
        created++;
      } catch (error) {
        errors.push(`Failed to create user ${userData.email}: ${error}`);
      }
    }

    this.logResult('Users', created, skipped, errors);
  }

  async seedGradeLevels() {
    const gradeLevelRepo = AppDataSource.getRepository(GradeLevel);
    let created = 0, skipped = 0;
    const errors: string[] = [];

    const gradeLevels = [
      { name: 'First Year', description: 'First Year Level', levelOrder: 1, academicYear: '2024-2025' },
      { name: 'Second Year', description: 'Second Year Level', levelOrder: 2, academicYear: '2024-2025' },
      { name: 'Third Year', description: 'Third Year Level', levelOrder: 3, academicYear: '2024-2025' },
      { name: 'Fourth Year', description: 'Fourth Year Level', levelOrder: 4, academicYear: '2024-2025' }
    ];

    for (const gradeData of gradeLevels) {
      try {
        const existing = await gradeLevelRepo.findOne({ where: { name: gradeData.name } });
        if (existing) {
          skipped++;
          continue;
        }

        const gradeLevel = gradeLevelRepo.create({ ...gradeData, isActive: true });
        await gradeLevelRepo.save(gradeLevel);
        created++;
      } catch (error) {
        errors.push(`Failed to create grade level ${gradeData.name}: ${error}`);
      }
    }

    this.logResult('Grade Levels', created, skipped, errors);
  }

  async seedCourses() {
    const courseRepo = AppDataSource.getRepository(Course);
    const departmentRepo = AppDataSource.getRepository(Department);
    let created = 0, skipped = 0;
    const errors: string[] = [];

    // Get CS department
    const csDepartment = await departmentRepo.findOne({ where: { code: 'CS' } });
    if (!csDepartment) {
      errors.push('Computer Studies department not found');
      this.logResult('Courses', created, skipped, errors);
      return;
    }

    const courses = [
      {
        name: 'Bachelor of Science in Information Systems',
        courseCode: 'BSIS',
        description: 'A four-year degree program that focuses on the design and implementation of information systems in organizations.',
        departmentId: csDepartment.id,
        isActive: true
      },
      {
        name: 'Bachelor of Science in Computer Science',
        courseCode: 'BSCS',
        description: 'A four-year degree program that covers the theoretical and practical aspects of computer science.',
        departmentId: csDepartment.id,
        isActive: true
      }
    ];

    for (const courseData of courses) {
      try {
        const existing = await courseRepo.findOne({ where: { courseCode: courseData.courseCode } });
        if (existing) {
          skipped++;
          continue;
        }

        const course = courseRepo.create(courseData);
        await courseRepo.save(course);
        created++;
      } catch (error) {
        errors.push(`Failed to create course ${courseData.name}: ${error}`);
      }
    }

    this.logResult('Courses', created, skipped, errors);
  }

  async seedSubjects() {
    const subjectRepo = AppDataSource.getRepository(Subject);
    const departmentRepo = AppDataSource.getRepository(Department);
    let created = 0, skipped = 0;
    const errors: string[] = [];

    // Get CS department
    const csDepartment = await departmentRepo.findOne({ where: { code: 'CS' } });
    if (!csDepartment) {
      errors.push('Computer Studies department not found');
      this.logResult('Subjects', created, skipped, errors);
      return;
    }

    // BSIS First Year Subjects
    const subjects = [
      {
        name: 'Mathematics in the Modern World',
        code: 'MATH101',
        units: 3,
        lectureHours: 3,
        labHours: 0,
        description: 'Introduction to mathematical concepts and their applications in modern technology and information systems.',
        departmentId: csDepartment.id
      },
      {
        name: 'Purposive Communication',
        code: 'ENG101',
        units: 3,
        lectureHours: 3,
        labHours: 0,
        description: 'Development of communication skills for academic and professional purposes.',
        departmentId: csDepartment.id
      },
      {
        name: 'Understanding the Self',
        code: 'PSYC101',
        units: 3,
        lectureHours: 3,
        labHours: 0,
        description: 'Exploration of personal identity, self-awareness, and human behavior.',
        departmentId: csDepartment.id
      },
      {
        name: 'Introduction to Computing',
        code: 'CS101',
        units: 3,
        lectureHours: 2,
        labHours: 3,
        description: 'Fundamentals of computer systems, programming concepts, and problem-solving techniques.',
        departmentId: csDepartment.id
      },
      {
        name: 'Computer Programming 1',
        code: 'CS102',
        units: 3,
        lectureHours: 2,
        labHours: 3,
        description: 'Introduction to programming using a high-level programming language.',
        departmentId: csDepartment.id
      },
      {
        name: 'Discrete Mathematics',
        code: 'MATH102',
        units: 3,
        lectureHours: 3,
        labHours: 0,
        description: 'Mathematical structures and concepts essential for computer science and information systems.',
        departmentId: csDepartment.id
      },
      {
        name: 'Fundamentals of Information Systems',
        code: 'IS101',
        units: 3,
        lectureHours: 2,
        labHours: 3,
        description: 'Introduction to information systems concepts, components, and applications in organizations.',
        departmentId: csDepartment.id
      }
    ];

    for (const subjectData of subjects) {
      try {
        const existing = await subjectRepo.findOne({ where: { code: subjectData.code } });
        if (existing) {
          skipped++;
          continue;
        }

        const subject = subjectRepo.create({ ...subjectData, isActive: true });
        await subjectRepo.save(subject);
        created++;
      } catch (error) {
        errors.push(`Failed to create subject ${subjectData.name}: ${error}`);
      }
    }

    this.logResult('Subjects', created, skipped, errors);
  }

  async seedSettings() {
    const settingsRepo = AppDataSource.getRepository(Settings);
    let created = 0, skipped = 0;
    const errors: string[] = [];

    const defaultSettings = [
      {
        key: 'school_name',
        value: 'Colegio de Alicia',
        description: 'Official name of the educational institution'
      },
      {
        key: 'school_address',
        value: 'Alicia, Isabela, Philippines',
        description: 'Physical address of the school'
      },
      {
        key: 'academic_year',
        value: '2024-2025',
        description: 'Current academic year'
      },
      {
        key: 'semester',
        value: '1',
        description: 'Current semester (1 or 2)'
      },
      {
        key: 'enrollment_open',
        value: 'true',
        description: 'Whether enrollment is currently open'
      },
      {
        key: 'max_units_per_semester',
        value: '24',
        description: 'Maximum units a student can enroll per semester'
      },
      {
        key: 'late_enrollment_fee',
        value: '500.00',
        description: 'Fee for late enrollment'
      },
      {
        key: 'school_logo',
        value: '/uploads/logo-bc.png',
        description: 'Path to the school logo image'
      }
    ];

    for (const settingData of defaultSettings) {
      try {
        const existing = await settingsRepo.findOne({ where: { key: settingData.key } });
        if (existing) {
          skipped++;
          continue;
        }

        const setting = settingsRepo.create(settingData);
        await settingsRepo.save(setting);
        created++;
      } catch (error) {
        errors.push(`Failed to create setting ${settingData.key}: ${error}`);
      }
    }

    this.logResult('Settings', created, skipped, errors);
  }

  async seedDocumentCategories() {
    const categoryRepo = AppDataSource.getRepository(DocumentCategory);
    let created = 0, skipped = 0;
    const errors: string[] = [];

    const categories = [
      {
        name: 'Academic Records',
        description: 'Official academic documents including transcripts, diplomas, certificates, and grade reports',
        color: '#10B981', // Green
        sortOrder: 0,
        isActive: true
      },
      {
        name: 'Enrollment Documents',
        description: 'Documents required for student enrollment and registration processes',
        color: '#3B82F6', // Blue
        sortOrder: 1,
        isActive: true
      },
      {
        name: 'Financial Records',
        description: 'Payment receipts, financial statements, tuition records, and billing documents',
        color: '#F59E0B', // Yellow/Amber
        sortOrder: 2,
        isActive: true
      },
      {
        name: 'Personal Documents',
        description: 'Personal identification documents, photos, birth certificates, and medical records',
        color: '#8B5CF6', // Purple
        sortOrder: 3,
        isActive: true
      },
      {
        name: 'Administrative Forms',
        description: 'Application forms, clearances, permits, and other administrative documents',
        color: '#F97316', // Orange
        sortOrder: 4,
        isActive: true
      },
      {
        name: 'Legal Documents',
        description: 'Contracts, legal agreements, affidavits, and other legal documentation',
        color: '#EF4444', // Red
        sortOrder: 5,
        isActive: true
      }
    ];

    for (const categoryData of categories) {
      try {
        // Check if category already exists
        const existingCategory = await categoryRepo.findOne({
          where: { name: categoryData.name }
        });

        if (existingCategory) {
          skipped++;
          continue;
        }

        // Create new category
        const category = categoryRepo.create(categoryData);
        await categoryRepo.save(category);
        created++;
      } catch (error) {
        errors.push(`Failed to create category ${categoryData.name}: ${error}`);
      }
    }

    this.logResult('Document Categories', created, skipped, errors);
  }

  async seedDocumentRequirements() {
    const requirementRepo = AppDataSource.getRepository(DocumentRequirement);
    const categoryRepo = AppDataSource.getRepository(DocumentCategory);
    const userRepo = AppDataSource.getRepository(User);
    let created = 0, skipped = 0;
    const errors: string[] = [];

    // First, get all categories to link requirements
    const categories = await categoryRepo.find();
    const categoryMap = new Map(categories.map(cat => [cat.name, cat.id]));

    // Get admin user for createdBy field
    const adminUser = await userRepo.findOne({ where: { email: 'admin@benedictcollege.com' } });

    // Dweezil's Code - Updated document requirements based on new specifications
    const requirements = [
      // Academic Records Category
      {
        name: 'Original form 9/Report Card',
        description: 'Original Form 9 or Report Card from previous school',
        isRequired: true,
        categoryId: categoryMap.get('Academic Records'),
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
          requiresVerification: true
        },
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        expirationDays: null
      },
      {
        name: 'Original Good Moral Certificate',
        description: 'Original Good Moral Certificate from previous school',
        isRequired: true,
        categoryId: categoryMap.get('Academic Records'),
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
          requiresVerification: true
        },
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        expirationDays: null
      },
      {
        name: 'Certificate of graduation/Diploma (photocopy)',
        description: 'Photocopy of Certificate of Graduation or Diploma',
        isRequired: true,
        categoryId: categoryMap.get('Academic Records'),
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
          requiresVerification: true
        },
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        expirationDays: null
      },
      {
        name: 'Original PSA Certificate',
        description: 'Original PSA Birth Certificate',
        isRequired: true,
        categoryId: categoryMap.get('Personal Documents'),
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
          requiresVerification: true
        },
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        expirationDays: null
      },
      {
        name: '3 copies of 2x2/passport picture (recent)',
        description: '3 copies of recent 2x2 or passport-sized pictures',
        isRequired: true,
        categoryId: categoryMap.get('Personal Documents'),
        validationRules: {
          allowedFileTypes: ['jpg', 'jpeg', 'png'],
          maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
          requiresVerification: true
        },
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        expirationDays: null
      }
    ];

    for (const reqData of requirements) {
      try {
        // Skip if category doesn't exist
        if (!reqData.categoryId) {
          errors.push(`Category not found for requirement: ${reqData.name}`);
          continue;
        }

        // Check if requirement already exists
        const existingRequirement = await requirementRepo.findOne({
          where: { name: reqData.name }
        });

        if (existingRequirement) {
          skipped++;
          continue;
        }

        // Create new requirement
        const requirement = requirementRepo.create({
          ...reqData,
          createdBy: adminUser?.id
        });
        await requirementRepo.save(requirement);
        created++;
      } catch (error) {
        errors.push(`Failed to create requirement ${reqData.name}: ${error}`);
      }
    }

    this.logResult('Document Requirements', created, skipped, errors);
  }

  async runAllSeeds() {
    console.log('🌱 Starting comprehensive data seeding...\n');
    
    try {
      // Initialize database connection
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        console.log('✅ Database connection established\n');
      }

      // Run all seed methods in order
      await this.seedDepartments();
      await this.seedPositions();
      await this.seedUsers();
      await this.seedGradeLevels();
      await this.seedCourses();
      await this.seedSubjects();
      await this.seedSettings();
      await this.seedDocumentCategories();
      await this.seedDocumentRequirements();

      // Summary
      console.log('\n🎉 Seeding completed successfully!');
      console.log('\n📊 Summary:');
      this.results.forEach(result => {
        const status = result.errors.length > 0 ? '⚠️' : '✅';
        console.log(`${status} ${result.entity}: ${result.created} created, ${result.skipped} skipped`);
        if (result.errors.length > 0) {
          result.errors.forEach(error => console.log(`   ❌ ${error}`));
        }
      });

      return {
        success: true,
        results: this.results
      };

    } catch (error) {
      console.error('❌ Seeding failed:', error);
      return {
        success: false,
        error: error.message,
        results: this.results
      };
    }
  }
}

export { DataSeeder };

// Allow running this script directly
if (require.main === module) {
  const seeder = new DataSeeder();
  seeder.runAllSeeds()
    .then((result) => {
      console.log('\n🏁 Seeding process finished');
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}
