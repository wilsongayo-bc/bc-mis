import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { Employee, EmployeeStatus } from '../entities/Employee';
import { Course } from '../entities/Course';
import { CourseSection } from '../entities/CourseSection';
import { Subject } from '../entities/Subject';
import { Schedule } from '../entities/Schedule';
import { Department } from '../entities/Department';
import bcrypt from 'bcrypt';

const scheduleData = [
  { code: 'GEC 1', description: 'UNDERSTANDING THE SELF', units: 3, startTime: '09:00', endTime: '10:30', days: 'WEDNESDAY,THURSDAY', room: 'ROOM 7', instructor: 'SHIELA A. GALORIO' },
  { code: 'GEC 2', description: 'READINGS IN PHILIPPINE HISTORY', units: 3, startTime: '13:00', endTime: '14:30', days: 'WEDNESDAY,THURSDAY', room: 'ROOM 7', instructor: 'NISHELL S. AMPONG' },
  { code: 'GEC 3', description: 'MATHEMATICS IN THE MODERN WORLD', units: 3, startTime: '10:30', endTime: '12:00', days: 'WEDNESDAY,THURSDAY', room: 'ROOM 7', instructor: 'JUNEL C. BUTLIG' },
  { code: 'GEC 4', description: 'SCIENCE, TECHNOLOGY AND SOCIETY', units: 3, startTime: '14:30', endTime: '16:00', days: 'MONDAY,TUESDAY', room: 'ROOM 7', instructor: 'RAFAEL DIABORDO' },
  { code: 'GEC 5', description: 'PURPOSIVE COMMUNICATION', units: 3, startTime: '07:30', endTime: '09:00', days: 'MONDAY,TUESDAY', room: 'ROOM 7', instructor: 'SARAH B. MAUSISA' },
  { code: 'GEC 6', description: 'ART APPRECIATION', units: 3, startTime: '07:30', endTime: '09:00', days: 'WEDNESDAY,THURSDAY', room: 'ROOM 7', instructor: 'MAUREEN ALEXANDRA E. TEMARIO' },
  { code: 'GEC 7', description: 'LIFE AND WORKS OF RIZAL', units: 3, startTime: '10:30', endTime: '12:00', days: 'MONDAY,TUESDAY', room: 'ROOM 7', instructor: 'NISHELL S. AMPONG' },
  { code: 'NSTP 1', description: 'LITERACY TRAINING SERVICE', units: 3, startTime: '08:00', endTime: '11:00', days: 'FRIDAY', room: 'ROOM 7', instructor: 'JUNEL C. BUTLIG' },
  { code: 'PATHFIT 1', description: 'MOVEMENT COMPETENCY TRAINING', units: 2, startTime: '09:00', endTime: '10:00', days: 'MONDAY,TUESDAY', room: 'ROOM 7', instructor: 'MAUREEN ALEXANDRA E. TEMARIO' }
];

async function seed() {
  await AppDataSource.initialize();
  console.log('Database connected');

  // 1. Ensure Department exists (Education)
  const deptRepo = AppDataSource.getRepository(Department);
  let dept = await deptRepo.findOne({ where: { code: 'EDUC' } });
  if (!dept) {
    dept = deptRepo.create({ code: 'EDUC', name: 'Teacher Education', description: 'Teacher Education Department' });
    await deptRepo.save(dept);
    console.log('Created EDUC department');
  }

  // 2. Ensure Course BTVTED exists
  const courseRepo = AppDataSource.getRepository(Course);
  let course = await courseRepo.findOne({ where: { courseCode: 'BTVTED' } });
  if (!course) {
    course = courseRepo.create({
      courseCode: 'BTVTED',
      name: 'Bachelor of Technical-Vocational Teacher Education',
      description: 'Bachelor of Technical-Vocational Teacher Education',
      department: dept,
      isActive: true
    });
    await courseRepo.save(course);
    console.log('Created BTVTED course');
  }

  // 3. Ensure Section BLOCK 3 exists
  const sectionRepo = AppDataSource.getRepository(CourseSection);
  let section = await sectionRepo.findOne({ where: { sectionName: 'BLOCK 3', courseId: course.id } });
  if (!section) {
    section = sectionRepo.create({
      course: course,
      sectionName: 'BLOCK 3',
      yearLevel: 'First Year',
      semester: 'First Semester',
      academicYear: '2024-2025',
      credits: 0,
      maxStudents: 50
    });
    await sectionRepo.save(section);
    console.log('Created BLOCK 3 section');
  } else {
    console.log('BLOCK 3 section already exists');
  }

  // 4. Process Schedules
  const subjectRepo = AppDataSource.getRepository(Subject);
  const userRepo = AppDataSource.getRepository(User);
  const employeeRepo = AppDataSource.getRepository(Employee);
  const scheduleRepo = AppDataSource.getRepository(Schedule);

  for (const item of scheduleData) {
    // Subject
    let subject = await subjectRepo.findOne({ where: { code: item.code } });
    if (!subject) {
      subject = subjectRepo.create({
        code: item.code,
        name: item.description,
        units: item.units,
        department: dept,
        isActive: true
      });
      await subjectRepo.save(subject);
      console.log(`Created subject ${item.code}`);
    }

    // Instructor
    const parts = item.instructor.trim().split(' ');
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, parts.length - 1).join(' ');
    
    // Check if user exists by lastName
    let user = await userRepo.findOne({ where: { lastName: lastName } });
    
    // In a real scenario, we might want better name matching, but this handles the basic seeding
    if (user && user.firstName.includes(firstName.split(' ')[0])) {
        // Match found
    } else if (user) {
        // LastName match but potentially different first name, let's create new if not found by strict check?
        // For simplicity in seeding, if lastName matches, we often assume it's the same person in these small datasets,
        // but let's be safe.
        // Actually, let's rely on the previous logic which tries to find or create.
    }

    if (!user) {
      // Create User
      const username = `${firstName.split(' ')[0].toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
      const email = `${username}@benedictcollege.edu.ph`; 
      
      const existingUser = await userRepo.findOne({ where: [{ username }, { email }] });
      if (existingUser) {
          user = existingUser;
          console.log(`Found existing user for ${firstName} ${lastName} via username/email`);
      } else {
          user = userRepo.create({
            firstName: firstName,
            lastName: lastName,
            username: username,
            email: email,
            password: await bcrypt.hash('default123', 10),
            role: UserRole.TEACHER,
            position: 'Instructor',
            isActive: true
          });
          try {
              await userRepo.save(user);
              console.log(`Created user ${firstName} ${lastName}`);
          } catch (e) {
              console.log(`Error creating user ${firstName} ${lastName}:`, e);
              // Try to find if error was unique constraint that wasn't caught
              user = await userRepo.findOne({ where: { lastName: lastName } });
              if (!user) continue;
          }
      }
    }

    // Ensure Employee record exists
    let employee = await employeeRepo.findOne({ where: { userId: user.id } });
    if (!employee) {
      const year = new Date().getFullYear();
      const seq = String((Date.now() + Math.floor(Math.random() * 1000)) % 100000).padStart(5, '0');
      employee = employeeRepo.create({
        user: user,
        employeeId: `${year}-00-${seq}`,
        department: 'Education',
        position: 'Instructor',
        hireDate: new Date(),
        status: EmployeeStatus.ACTIVE
      });
      await employeeRepo.save(employee);
      console.log(`Created employee for ${user.firstName} ${user.lastName}`);
    }

    // Create Schedule
    const existingSchedule = await scheduleRepo.findOne({
      where: {
        subjectId: subject.id,
        courseSectionId: section.id
      }
    });

    if (!existingSchedule) {
      const schedule = scheduleRepo.create({
        subject: subject,
        courseSection: section,
        teacher: employee,
        room: item.room,
        dayOfWeek: item.days,
        startTime: item.startTime,
        endTime: item.endTime,
        semester: 'First Semester',
        academicYear: '2024-2025',
        isActive: true
      });
      await scheduleRepo.save(schedule);
      console.log(`Created schedule for ${item.code}`);
    } else {
      console.log(`Schedule for ${item.code} already exists`);
    }
  }

  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
