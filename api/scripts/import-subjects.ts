import { AppDataSource } from '../config/database';
import { Subject } from '../entities/Subject';
import { Department } from '../entities/Department';
import { SubjectPrerequisite, PrerequisiteCategory } from '../entities/SubjectPrerequisite';
import { Schedule } from '../entities/Schedule';
import { Enrollment } from '../entities/Enrollment';
import { CourseSection } from '../entities/CourseSection';
import * as fs from 'fs';
import * as path from 'path';

interface RawSubject {
  code: string;
  name: string;
  units: number;
  lectureHours?: number;
  lectureUnits?: number; // Handle variation
  labHours?: number;
  labUnits?: number; // Handle variation
  departmentCode: string;
  description?: string | null;
  prerequisites: string[];
  corequisites: string[];
}

async function importSubjects() {
  try {
    console.log('Initializing database connection...');
    await AppDataSource.initialize();
    console.log('Database connected.');

    const files = [
      'subjects-data-template-BSIS.json',
      'subjects-data-template-BTVTED.json'
    ];

    const subjectRepo = AppDataSource.getRepository(Subject);
    const deptRepo = AppDataSource.getRepository(Department);
    const prereqRepo = AppDataSource.getRepository(SubjectPrerequisite);
    const scheduleRepo = AppDataSource.getRepository(Schedule);

    // Track statistics
    let created = 0;
    let updated = 0;
    let prereqsCreated = 0;

    // 0. CLEAR EXISTING DATA
    console.log('\n--- CLEARING EXISTING DATA ---');
    
    // Disable Foreign Key Checks to allow truncation/deletion regardless of order
    console.log('Disabling Foreign Key Checks...');
    try {
        await AppDataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    } catch (err) {
        console.warn('Warning: Could not disable foreign key checks (might lack permissions). Proceeding with standard deletion...', err);
    }

    const enrollmentRepo = AppDataSource.getRepository(Enrollment);
    const courseSectionRepo = AppDataSource.getRepository(CourseSection);

    try {
        console.log('Deleting all enrollments...');
        await enrollmentRepo.createQueryBuilder().delete().execute();
    } catch (err) {
        console.warn('Warning: Failed to delete enrollments:', err);
    }

    try {
        console.log('Deleting all schedules...');
        await scheduleRepo.createQueryBuilder().delete().execute();
    } catch (err) {
        console.warn('Warning: Failed to delete schedules:', err);
    }

    try {
        console.log('Deleting all course sections...');
        await courseSectionRepo.createQueryBuilder().delete().execute();
    } catch (err) {
        console.warn('Warning: Failed to delete course sections:', err);
    }
    
    try {
        console.log('Deleting all subject prerequisites...');
        await prereqRepo.createQueryBuilder().delete().execute();
    } catch (err) {
        console.warn('Warning: Failed to delete subject prerequisites:', err);
    }
    
    try {
        console.log('Deleting all subjects...');
        await subjectRepo.createQueryBuilder().delete().execute();
        console.log('Existing subjects cleared.');
    } catch (err) {
        console.error('Error: Failed to delete subjects:', err);
        // We still try to proceed or throw? 
        // If we can't clear subjects, import might duplicate or fail.
        throw err;
    } finally {
        // Always re-enable FK checks
        console.log('Re-enabling Foreign Key Checks...');
        try {
            await AppDataSource.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (err) {
            console.warn('Warning: Could not re-enable foreign key checks:', err);
        }
    }

    // 1. First Pass: Create/Update Subjects
    console.log('\n--- FIRST PASS: Creating/Updating Subjects ---');
    
    const resolveFilePath = (basename: string): string | null => {
      const candidates = [
        path.join(__dirname, basename),
        path.join(__dirname, '../../scripts', basename),
        path.join(process.cwd(), 'api/scripts', basename),
        path.join(process.cwd(), 'api/dist/scripts', basename)
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) return p;
      }
      return null;
    };

    for (const file of files) {
      const filePath = resolveFilePath(file);
      if (!filePath) {
        console.warn(`File not found: ${file}`);
        continue;
      }

      console.log(`Processing ${file}...`);
      const rawData: RawSubject[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Group by department to minimize DB lookups
      const deptCode = rawData[0]?.departmentCode;
      if (!deptCode) {
        console.warn(`No department code found in ${file}, skipping.`);
        continue;
      }

      // Find or Create Department
      let department = await deptRepo.findOne({ where: { code: deptCode } });
      if (!department) {
        console.log(`Creating department: ${deptCode}`);
        department = deptRepo.create({
          code: deptCode,
          name: deptCode === 'BSIS' ? 'Bachelor of Science in Information Systems' : 'Bachelor of Technical-Vocational Teacher Education',
          description: `Department of ${deptCode}`,
          isActive: true
        });
        await deptRepo.save(department);
      }

      for (const item of rawData) {
        // Normalize fields
        const lectureHours = item.lectureHours ?? item.lectureUnits ?? 0;
        const labHours = item.labHours ?? item.labUnits ?? 0;
        // Clean code (remove extra spaces if any, though user data looks okay)
        const code = item.code.trim();

        let subject = await subjectRepo.findOne({ where: { code } });

        if (subject) {
          // Update existing
          subject.name = item.name;
          subject.units = item.units;
          subject.lectureHours = lectureHours;
          subject.labHours = labHours;
          subject.description = item.description || undefined;
          subject.department = department;
          await subjectRepo.save(subject);
          updated++;
        } else {
          // Create new
          subject = subjectRepo.create({
            code,
            name: item.name,
            units: item.units,
            lectureHours,
            labHours,
            description: item.description || undefined,
            department,
            isActive: true
          });
          await subjectRepo.save(subject);
          created++;
        }
      }
    }

    // 2. Second Pass: Process Prerequisites and Corequisites
    console.log('\n--- SECOND PASS: Linking Prerequisites & Corequisites ---');

    for (const file of files) {
      const filePath = resolveFilePath(file);
      if (!filePath) continue;

      const rawData: RawSubject[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      for (const item of rawData) {
        const subjectCode = item.code.trim();
        const subject = await subjectRepo.findOne({ where: { code: subjectCode } });

        if (!subject) continue; // Should not happen

        // Helper to add relation
                const addRelations = async (targetCodes: string[] | undefined, category: PrerequisiteCategory) => {
                    if (!targetCodes || !Array.isArray(targetCodes)) return;

                    for (const targetCode of targetCodes) {
                        const cleanTargetCode = targetCode.trim();
                        
                        // Skip "NONE" or empty
                        if (!cleanTargetCode || cleanTargetCode.toUpperCase() === 'NONE' || cleanTargetCode.toUpperCase() === 'N/A') continue;

                        // Find the prerequisite subject
                        let targetSubject = await subjectRepo.findOne({ where: { code: cleanTargetCode } });
                        
                        // Fallback: Try case-insensitive search if strict match fails (though MySQL is often case-insensitive)
                        // Or try matching with/without spaces
                        if (!targetSubject) {
                             const noSpaceCode = cleanTargetCode.replace(/\s+/g, '');
                             // Try to find by code ignoring spaces or case
                             // Note: In TypeORM, ILike is for case-insensitive
                             // We can also fetch all subjects and match in memory if needed, but let's try a few variations
                             
                             // Try simple variations
                             targetSubject = await subjectRepo.findOne({ where: { code: noSpaceCode } });
                        }

                        if (!targetSubject) {
                                console.warn(`  [Warning] ${category} subject not found: '${cleanTargetCode}' for subject '${subjectCode}'`);
                                continue;
                        }

                        // Check if relation already exists
                        const existingRel = await prereqRepo.findOne({
                            where: {
                                subjectId: subject.id,
                                prerequisiteId: targetSubject.id
                            }
                        });

                if (!existingRel) {
                    const relation = prereqRepo.create({
                        subject,
                        prerequisiteSubject: targetSubject,
                        category
                    });
                    await prereqRepo.save(relation);
                    prereqsCreated++;
                    console.log(`  Linked ${category}: ${subjectCode} -> ${cleanTargetCode}`);
                } else {
                    // Update category if needed
                    if (existingRel.category !== category) {
                        existingRel.category = category;
                        await prereqRepo.save(existingRel);
                        console.log(`  Updated ${category}: ${subjectCode} -> ${cleanTargetCode}`);
                    }
                }
            }
        };

        await addRelations(item.prerequisites, PrerequisiteCategory.REQUIRED);
                await addRelations(item.corequisites, PrerequisiteCategory.COREQUISITE);
      }
    }

    console.log('\n--- IMPORT SUMMARY ---');
    console.log(`Subjects Created: ${created}`);
    console.log(`Subjects Updated: ${updated}`);
    console.log(`Prerequisite Links Created: ${prereqsCreated}`);

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

importSubjects();
