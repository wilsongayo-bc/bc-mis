import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Course } from '../entities/Course';
import { Department } from '../entities/Department';

async function run() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const courseRepo = AppDataSource.getRepository(Course);
    const deptRepo = AppDataSource.getRepository(Department);

    const csDept = await deptRepo.findOne({ where: { code: 'CS' } });
    const educDept = await deptRepo.findOne({ where: { code: 'EDUC' } });

    if (!csDept || !educDept) {
      console.error('Missing departments: CS or EDUC');
      process.exit(1);
    }

    const allowed = [
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
    const allowedCodes = new Set(allowed.map(a => a.courseCode));

    for (const a of allowed) {
      const match = existing.find(c => c.courseCode === a.courseCode) ||
                  existing.find(c => c.name.toLowerCase().includes('technical vocational teacher education'));
      if (match) {
        match.name = a.name;
        match.courseCode = a.courseCode;
        match.departmentId = a.departmentId;
        match.description = a.description;
        match.isActive = true;
        await courseRepo.save(match);
        console.log(`Updated: ${a.courseCode} - ${a.name}`);
      } else {
        const course = courseRepo.create({
          ...a,
          isActive: true
        });
        await courseRepo.save(course);
        console.log(`Created: ${a.courseCode} - ${a.name}`);
      }
    }

    for (const c of existing) {
      if (!allowedCodes.has(c.courseCode)) {
        c.isActive = false;
        if (!c.name.startsWith('ARCHIVED - ')) {
          c.name = `ARCHIVED - ${c.name}`;
        }
        await courseRepo.save(c);
        console.log(`Archived: ${c.courseCode} - ${c.name}`);
      }
    }

    const final = await courseRepo.find();
    console.log('Summary:');
    final.forEach(c => {
      console.log(` - ${c.courseCode} | ${c.name} | ${c.isActive ? 'Active' : 'Archived'}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
