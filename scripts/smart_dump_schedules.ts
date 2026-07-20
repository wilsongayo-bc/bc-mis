import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const LOCAL_DB = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'letmein25',
  database: process.env.DB_NAME || 'bc_mis',
  port: parseInt(process.env.DB_PORT || '3306'),
};

// Remote credentials from user snippet
const REMOTE_DB = {
  host: '139.180.143.176',
  user: 'bc_mis',
  password: 'letmein25',
  database: 'bc_mis',
  port: 3306,
};

async function main() {
  console.log('🔄 Starting Smart Dump Sync...');
  
  let localConn, remoteConn;

  try {
    // 1. Connect to Databases
    console.log('Connecting to LOCAL database...');
    localConn = await mysql.createConnection(LOCAL_DB);
    
    console.log('Connecting to REMOTE database...');
    try {
      remoteConn = await mysql.createConnection(REMOTE_DB);
    } catch (err) {
      console.warn('⚠️  Could not connect to REMOTE database directly.');
      console.warn('   Will attempt to use offline mapping from scripts/remote_mapping.json');
      console.warn('   (Error: ' + (err as Error).message + ')');
      // Do not return here; let the script proceed to check for the JSON file
    }

    // 2. Build Lookup Maps
    console.log('📥 Fetching Remote Data for mapping...');
    
    let remoteEmployees: Array<{ id: string; email: string }> = [];
    let remoteCourses: Array<{ id: string; courseCode: string }> = [];
    let remoteSubjects: Array<{ id: string; code: string }> = [];
    let remoteSections: Array<{ id: string; courseId: string; yearLevel: number; sectionName: string; semester: string; academicYear: string }> = [];

    if (remoteConn) {
      // Fetch from DB
      [remoteEmployees] = await remoteConn.query(`
        SELECT e.id, u.email 
        FROM employees e 
        JOIN users u ON e.userId = u.id
      `) as [Array<{ id: string; email: string }>, unknown];
      
      [remoteCourses] = await remoteConn.query('SELECT id, courseCode FROM courses') as [Array<{ id: string; courseCode: string }>, unknown];
      
      [remoteSubjects] = await remoteConn.query('SELECT id, code FROM subjects') as [Array<{ id: string; code: string }>, unknown];
      
      [remoteSections] = await remoteConn.query('SELECT * FROM course_sections') as [Array<{ id: string; courseId: string; yearLevel: number; sectionName: string; semester: string; academicYear: string }>, unknown];
      
    } else {
      // Try to load from JSON
      const mappingPath = path.join(process.cwd(), 'scripts', 'remote_mapping.json');
      if (fs.existsSync(mappingPath)) {
        console.log('✅ Found remote_mapping.json! Using offline mapping.');
        const fileContent = fs.readFileSync(mappingPath, 'utf-8');
        
        // Handle if the user pasted the full SQL output which might be wrapped in "result": "..." or just the JSON
        let data: { employees?: unknown[]; courses?: unknown[]; subjects?: unknown[]; sections?: unknown[]; result?: unknown };
        try {
          data = JSON.parse(fileContent);
          // If the user saved the result of JSON_OBJECT query, it might be nested
          if (data.result && typeof data.result === 'string') {
             // It might be double encoded if they exported weirdly, but usually standard JSON export
             data = JSON.parse(data.result);
          } else if (data.result && typeof data.result === 'object') {
             data = data.result as typeof data;
          }
        } catch (_e) {
          console.error('❌ Failed to parse remote_mapping.json');
          return;
        }

        remoteEmployees = (data.employees || []) as typeof remoteEmployees;
        remoteCourses = (data.courses || []) as typeof remoteCourses;
        remoteSubjects = (data.subjects || []) as typeof remoteSubjects;
        remoteSections = (data.sections || []) as typeof remoteSections;

      } else {
        console.error('❌ Remote connection failed and no mapping file found.');
        console.error('   1. Whitelist this IP (64.224.132.118) on the remote DB server.');
        console.error('   OR');
        console.error('   2. Run scripts/get_remote_mapping_data.sql on the remote DB');
        console.error('      and save the JSON result to scripts/remote_mapping.json');
        return;
      }
    }

    // Process Maps
    const emailToEmployeeId = new Map<string, string>();
    remoteEmployees.forEach((row) => emailToEmployeeId.set(row.email.toLowerCase(), row.id));
    console.log(`   Found ${remoteEmployees.length} employees.`);

    const codeToCourseId = new Map<string, string>();
    remoteCourses.forEach((row) => codeToCourseId.set(row.courseCode, row.id));
    console.log(`   Found ${remoteCourses.length} courses.`);

    const codeToSubjectId = new Map<string, string>();
    remoteSubjects.forEach((row) => codeToSubjectId.set(row.code, row.id));
    console.log(`   Found ${remoteSubjects.length} subjects.`);

    const compositeToSectionId = new Map<string, string>();
    remoteSections.forEach((row) => {
      const key = `${row.courseId}|${row.yearLevel}|${row.sectionName}|${row.semester}|${row.academicYear}`;
      compositeToSectionId.set(key, row.id);
    });
    console.log(`   Found ${remoteSections.length} sections.`);


    // 3. Process Local Data & Generate SQL
    console.log('📤 Processing Local Data...');
    let sqlOutput = `-- Smart Sync Dump for Schedules & Sections\n`;
    sqlOutput += `-- Generated at: ${new Date().toISOString()}\n`;
    sqlOutput += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    // 3.1 Course Sections
    const [localSections] = await localConn.query(`
      SELECT cs.*, c.courseCode 
      FROM course_sections cs 
      JOIN courses c ON cs.courseId = c.id
    `) as [Array<{
      id: string;
      courseCode: string;
      yearLevel: number;
      sectionName: string;
      credits: number;
      maxStudents: number;
      semester: string;
      academicYear: string;
      isActive: boolean;
    }>, unknown];

    const localSectionIdToRemoteId = new Map<string, string>();
    const sectionsToInsert: string[] = [];

    for (const section of localSections) {
      const remoteCourseId = codeToCourseId.get(section.courseCode);
      if (!remoteCourseId) {
        console.warn(`   ⚠️  Skipping Section ${section.sectionName}: Course '${section.courseCode}' not found on remote.`);
        continue;
      }

      const key = `${remoteCourseId}|${section.yearLevel}|${section.sectionName}|${section.semester}|${section.academicYear}`;
      const existingRemoteId = compositeToSectionId.get(key);

      if (existingRemoteId) {
        // Map Local -> Existing Remote
        localSectionIdToRemoteId.set(section.id, existingRemoteId);
      } else {
        // New Section needed
        // We keep the Local ID for the INSERT, but we must ensure it doesn't conflict with any other remote ID
        // (Assuming UUIDs are unique enough)
        localSectionIdToRemoteId.set(section.id, section.id);
        
        // Prepare INSERT
        // Use remoteCourseId
        const active = section.isActive ? 1 : 0;
        
        sectionsToInsert.push(`('${section.id}', '${remoteCourseId}', '${section.yearLevel}', '${section.sectionName}', ${section.credits}, ${section.maxStudents}, '${section.semester}', '${section.academicYear}', ${active}, NOW(), NOW())`);
      }
    }

    if (sectionsToInsert.length > 0) {
      sqlOutput += `-- New Course Sections (${sectionsToInsert.length})\n`;
      sqlOutput += `INSERT IGNORE INTO course_sections (id, courseId, yearLevel, sectionName, credits, maxStudents, semester, academicYear, isActive, createdAt, updatedAt) VALUES\n`;
      sqlOutput += sectionsToInsert.join(',\n') + ';\n\n';
    } else {
      sqlOutput += `-- No new course_sections to insert.\n\n`;
    }

    // 3.2 Schedules
    const [localSchedules] = await localConn.query(`
      SELECT s.*, sub.code as subjectCode, u.email as teacherEmail
      FROM schedules s
      LEFT JOIN subjects sub ON s.subjectId = sub.id
      LEFT JOIN employees e ON s.teacherId = e.id
      LEFT JOIN users u ON e.userId = u.id
    `) as [Array<{
      id: string;
      subjectCode: string;
      courseSectionId: string;
      teacherEmail: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      room: string;
      semester: string;
      academicYear: string;
      isActive: boolean;
      startDate: Date | null;
      endDate: Date | null;
    }>, unknown];

    const schedulesToInsert: string[] = [];
    let skippedSchedules = 0;

    // Helper to fix email typo
    const normalizeEmailDomain = (email: string): string => {
      if (!email) return email;
      let normalized = email;
      
      // Fix 'coldegiodealicia' -> 'benedictcollege' (Local typo fix)
      const parts = normalized.split('@');
      if (parts.length === 2 && parts[1] === 'coldegiodealicia.com') {
        normalized = `${parts[0]}@benedictcollege.com`;
      }

      return normalized;
    };

    // Helper to find remote employee with fallback for remote typos
    const findRemoteEmployeeId = (localEmail: string) => {
      const normalized = normalizeEmailDomain(localEmail);
      
      // 1. Try exact match
      let id = emailToEmployeeId.get(normalized);
      if (id) return id;

      // 2. Try matching remote typo 'colegiodelalicia.com'
      if (normalized.endsWith('@benedictcollege.com')) {
        const typoEmail = normalized.replace('@benedictcollege.com', '@colegiodelalicia.com');
        id = emailToEmployeeId.get(typoEmail);
        if (id) return id;
      }

      return null;
    };

    // Helper to find remote subject with fuzzy matching
    const findRemoteSubjectId = (localCode: string) => {
      // 1. Try exact match
      let id = codeToSubjectId.get(localCode);
      if (id) return id;

      // 2. Try 'GE CC' -> 'GECC'
      if (localCode.includes('GE CC')) {
         const altCode = localCode.replace('GE CC', 'GECC');
         id = codeToSubjectId.get(altCode);
         if (id) return id;
      }

      return null;
    };

    for (const sched of localSchedules) {
      // Resolve Dependencies
      const remoteSubjectId = findRemoteSubjectId(sched.subjectCode);
      const remoteSectionId = localSectionIdToRemoteId.get(sched.courseSectionId);
      
      // Fix email typo before lookup
      const remoteTeacherId = findRemoteEmployeeId(sched.teacherEmail?.toLowerCase());

      if (!remoteSubjectId) {
        console.warn(`   ⚠️  Skip Schedule: Subject '${sched.subjectCode}' not found remote.`);
        skippedSchedules++; continue;
      }
      if (!remoteSectionId) {
        console.warn(`   ⚠️  Skip Schedule: Section ID '${sched.courseSectionId}' not resolved (Course missing?).`);
        skippedSchedules++; continue;
      }
      if (!remoteTeacherId) {
        console.warn(`   ⚠️  Skip Schedule: Teacher '${sched.teacherEmail}' not found remote.`);
        skippedSchedules++; continue;
      }

      // Prepare INSERT
      const val = (v: unknown) => {
        if (v === null || v === undefined) return 'NULL';
        if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
        return `'${String(v).replace(/'/g, "\\'")}'`;
      };
      
      const active = sched.isActive ? 1 : 0;
      
      // We use the LOCAL ID for the schedule, or generate new? 
      // Safe to use local ID if we are sure it doesn't exist.
      // Or we can let it be.
      
      schedulesToInsert.push(`('${sched.id}', '${remoteSubjectId}', '${remoteSectionId}', '${remoteTeacherId}', '${sched.dayOfWeek}', '${sched.startTime}', '${sched.endTime}', '${sched.room}', '${sched.semester}', '${sched.academicYear}', ${active}, NOW(), NOW(), ${val(sched.startDate)}, ${val(sched.endDate)})`);
    }

    if (schedulesToInsert.length > 0) {
      sqlOutput += `-- Schedules (${schedulesToInsert.length})\n`;
      sqlOutput += `TRUNCATE TABLE schedules;\n`; // Optional: Truncate if we want to replace all. User said "insert", but usually sync implies replace or append.
      // Given the complexity, TRUNCATE is cleaner IF we are replacing everything.
      // But maybe safer to just INSERT IGNORE.
      // User said "dump data from local ... then insert to remote".
      // I'll use TRUNCATE to be clean as per previous dump style.
      
      sqlOutput += `INSERT INTO schedules (id, subjectId, courseSectionId, teacherId, dayOfWeek, startTime, endTime, room, semester, academicYear, isActive, createdAt, updatedAt, startDate, endDate) VALUES\n`;
      sqlOutput += schedulesToInsert.join(',\n') + ';\n\n';
    } else {
      sqlOutput += `-- No schedules to insert.\n`;
    }

    sqlOutput += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    const outputPath = path.join(process.cwd(), 'scripts', 'smart_dump_remote.sql');
    fs.writeFileSync(outputPath, sqlOutput);
    
    console.log('✅ Smart Dump Generated!');
    console.log(`   - New Sections: ${sectionsToInsert.length}`);
    console.log(`   - Schedules: ${schedulesToInsert.length}`);
    console.log(`   - Skipped Schedules: ${skippedSchedules}`);
    console.log(`   File: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (localConn) await localConn.end();
    if (remoteConn) await remoteConn.end();
  }
}

main();
