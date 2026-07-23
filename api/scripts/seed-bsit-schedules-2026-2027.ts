import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { AcademicYear } from '../entities/AcademicYear';
import { Course } from '../entities/Course';
import { CourseSection } from '../entities/CourseSection';
import { Employee, EmployeeStatus } from '../entities/Employee';
import { Schedule } from '../entities/Schedule';
import { Settings } from '../entities/Settings';
import { Subject } from '../entities/Subject';
import { User, UserRole } from '../entities/User';
import { BSIT_SCHEDULES_2026_2027_FIRST_SEM } from './data/bsit-schedules-2026-2027';

const ACADEMIC_YEAR = '2026-2027';
const SEMESTER = 'First Semester';
const PLACEHOLDER_TEACHER = {
  email: 'tba.teacher@benedictcollege.edu',
  username: 'tba.teacher',
  password: 'TbaTeacher123!',
  firstName: 'TBA',
  lastName: 'INSTRUCTOR',
  position: 'Instructor'
};
const PLACEHOLDER_EMPLOYEE_ID = 'TBA-TEACHER';

const yearLevelToNumber = (yearLevel: CourseSection['yearLevel']): number => {
  if (yearLevel === 'First Year') return 1;
  if (yearLevel === 'Second Year') return 2;
  if (yearLevel === 'Third Year') return 3;
  return 4;
};

async function upsertSetting(repo: Repository<Settings>, key: string, value: string) {
  const existing = await repo.findOne({ where: { key } });
  if (existing) {
    if (existing.value !== value) {
      existing.value = value;
      await repo.save(existing);
    }
    return existing;
  }
  const setting = repo.create({ key, value });
  return repo.save(setting);
}

async function seed() {
  await AppDataSource.initialize();

  const academicYearRepo = AppDataSource.getRepository(AcademicYear);
  const settingsRepo = AppDataSource.getRepository(Settings);
  const courseRepo = AppDataSource.getRepository(Course);
  const courseSectionRepo = AppDataSource.getRepository(CourseSection);
  const userRepo = AppDataSource.getRepository(User);
  const employeeRepo = AppDataSource.getRepository(Employee);
  const subjectRepo = AppDataSource.getRepository(Subject);
  const scheduleRepo = AppDataSource.getRepository(Schedule);

  const existingActive = await academicYearRepo.findOne({ where: { isActive: true } });
  if (existingActive && existingActive.year !== ACADEMIC_YEAR) {
    existingActive.isActive = false;
    await academicYearRepo.save(existingActive);
  }

  let academicYear = await academicYearRepo.findOne({ where: { year: ACADEMIC_YEAR } });
  if (!academicYear) {
    academicYear = academicYearRepo.create({ year: ACADEMIC_YEAR, isActive: true });
    await academicYearRepo.save(academicYear);
  } else if (!academicYear.isActive) {
    academicYear.isActive = true;
    await academicYearRepo.save(academicYear);
  }

  await upsertSetting(settingsRepo, 'academic_year', ACADEMIC_YEAR);
  await upsertSetting(settingsRepo, 'semester', '1');

  const course = await courseRepo.findOne({ where: { courseCode: 'BSIT' } });
  if (!course) {
    throw new Error('Course BSIT not found. Ensure migrations have been applied.');
  }

  let placeholderUser = await userRepo.findOne({ where: { email: PLACEHOLDER_TEACHER.email } });
  if (!placeholderUser) {
    const password = await bcrypt.hash(PLACEHOLDER_TEACHER.password, 10);
    placeholderUser = userRepo.create({
      email: PLACEHOLDER_TEACHER.email,
      username: PLACEHOLDER_TEACHER.username,
      password,
      firstName: PLACEHOLDER_TEACHER.firstName,
      lastName: PLACEHOLDER_TEACHER.lastName,
      position: PLACEHOLDER_TEACHER.position,
      role: UserRole.TEACHER
    });
    placeholderUser = await userRepo.save(placeholderUser);
  }

  let placeholderEmployee = await employeeRepo.findOne({ where: { employeeId: PLACEHOLDER_EMPLOYEE_ID } });
  if (!placeholderEmployee) {
    placeholderEmployee = employeeRepo.create({
      employeeId: PLACEHOLDER_EMPLOYEE_ID,
      userId: placeholderUser.id,
      department: 'Information Technology',
      position: 'Instructor',
      hireDate: new Date(),
      status: EmployeeStatus.ACTIVE
    });
    placeholderEmployee = await employeeRepo.save(placeholderEmployee);
  }

  const sectionByYearLevel = new Map<string, CourseSection>();
  for (const yearLevel of ['First Year', 'Second Year', 'Third Year', 'Fourth Year'] as const) {
    const existing = await courseSectionRepo.findOne({
      where: {
        courseId: course.id,
        yearLevel,
        sectionName: 'A',
        semester: SEMESTER,
        academicYear: ACADEMIC_YEAR
      }
    });

    if (existing) {
      sectionByYearLevel.set(yearLevel, existing);
      continue;
    }

    const created = courseSectionRepo.create({
      courseId: course.id,
      yearLevel,
      sectionName: 'A',
      credits: 0,
      maxStudents: 40,
      semester: SEMESTER,
      academicYear: ACADEMIC_YEAR,
      isActive: true
    });
    const saved = await courseSectionRepo.save(created);
    sectionByYearLevel.set(yearLevel, saved);
  }

  let createdSubjects = 0;
  let createdSchedules = 0;
  let skippedSchedules = 0;

  for (const row of BSIT_SCHEDULES_2026_2027_FIRST_SEM) {
    const section = sectionByYearLevel.get(row.yearLevel);
    if (!section) {
      throw new Error(`Course section not found for yearLevel=${row.yearLevel}`);
    }

    let subject = await subjectRepo.findOne({ where: { code: row.subjectCode } });
    if (!subject) {
      subject = subjectRepo.create({
        code: row.subjectCode,
        name: row.subjectName,
        units: row.units,
        departmentId: course.departmentId,
        courseId: course.id,
        yearLevel: yearLevelToNumber(row.yearLevel),
        semester: SEMESTER,
        isActive: true
      });
      subject = await subjectRepo.save(subject);
      createdSubjects++;
    }

    const existingSchedule = await scheduleRepo.findOne({
      where: {
        subjectId: subject.id,
        courseSectionId: section.id,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        room: row.room,
        semester: SEMESTER,
        academicYear: ACADEMIC_YEAR,
      }
    });

    if (existingSchedule) {
      skippedSchedules++;
      continue;
    }

    const schedule = scheduleRepo.create({
      subjectId: subject.id,
      courseSectionId: section.id,
      teacherId: placeholderEmployee.id,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      room: row.room,
      semester: SEMESTER,
      academicYear: ACADEMIC_YEAR,
      isActive: true
    });
    await scheduleRepo.save(schedule);
    createdSchedules++;
  }

  process.stdout.write(
    `Seed complete: subjects(created=${createdSubjects}), schedules(created=${createdSchedules}, skipped=${skippedSchedules})\n`
  );

  await AppDataSource.destroy();
}

seed().catch(async err => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  try {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  } catch {
    void 0;
  }
  process.exit(1);
});
