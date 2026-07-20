import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Course } from '../entities/Course';
import { Department } from '../entities/Department';
import { CourseSection } from '../entities/CourseSection';
import { Schedule } from '../entities/Schedule';
import { Enrollment } from '../entities/Enrollment';

async function run() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const courseRepo = AppDataSource.getRepository(Course);
    const deptRepo = AppDataSource.getRepository(Department);

    // Resolve departments for allowed courses
    const csDept = await deptRepo.findOne({ where: { code: 'CS' } });
    const educDept = await deptRepo.findOne({ where: { code: 'EDUC' } });
    if (!csDept || !educDept) {
      console.error('Missing departments: CS or EDUC');
      process.exit(1);
    }

    // Allowed set (kept)
    const allowedCodes = new Set(['BSIS', 'BTVTED']);

    // Ensure allowed courses exist with correct names/codes
    const desired = [
      {
        courseCode: 'BSIS',
        name: 'Bachelor of Science in Information Systems',
        departmentId: csDept.id,
        description: 'A four-year degree program focusing on design and implementation of information systems.'
      },
      {
        courseCode: 'BTVTED',
        name: 'Bachelor in Technical Vocational Teacher Education',
        departmentId: educDept.id,
        description: 'Teacher education program for technical-vocational specialization.'
      }
    ];

    const existing = await courseRepo.find();

    for (const d of desired) {
      const matchByCode = existing.find(c => c.courseCode === d.courseCode);
      const matchByName = existing.find(c => c.name.toLowerCase().includes('technical vocational teacher education')) || existing.find(c => c.name.toLowerCase().includes('information systems'));
      const target = matchByCode || matchByName;
      if (target) {
        target.name = d.name;
        target.courseCode = d.courseCode;
        target.departmentId = d.departmentId;
        target.description = d.description;
        target.isActive = true;
        await courseRepo.save(target);
        console.log(`Ensured course: ${d.courseCode} - ${d.name}`);
      } else {
        await courseRepo.save(courseRepo.create({ ...d, isActive: true }));
        console.log(`Created course: ${d.courseCode} - ${d.name}`);
      }
    }

    // Delete all non-allowed courses (hard delete)
    const sectionRepo = AppDataSource.getRepository(CourseSection);
    const scheduleRepo = AppDataSource.getRepository(Schedule);
    const enrollmentRepo = AppDataSource.getRepository(Enrollment);

    const toDelete = await courseRepo.find();
    for (const c of toDelete) {
      if (!allowedCodes.has(c.courseCode)) {
        console.log(`Preparing delete: ${c.courseCode} - ${c.name}`);
        const sections = await sectionRepo.find({ where: { courseId: c.id } });
        for (const s of sections) {
          // Delete dependent schedules and enrollments explicitly to avoid FK issues
          await scheduleRepo.delete({ courseSectionId: s.id });
          await enrollmentRepo.delete({ courseSectionId: s.id });
          await sectionRepo.delete(s.id);
          console.log(` - Removed section ${s.id} and its schedules/enrollments`);
        }
        // Also remove enrollments tied directly to the courseId
        await enrollmentRepo.delete({ courseId: c.id });
        await courseRepo.delete(c.id);
        console.log(`Deleted course: ${c.courseCode}`);
      }
    }

    const final = await courseRepo.find();
    console.log('Final course list:');
    final.forEach(c => console.log(` - ${c.courseCode} | ${c.name}`));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
