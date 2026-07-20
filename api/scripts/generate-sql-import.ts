
import * as fs from 'fs';
import * as path from 'path';

interface RawSubject {
  code: string;
  name: string;
  units: number;
  lectureHours?: number;
  lectureUnits?: number;
  labHours?: number;
  labUnits?: number;
  departmentCode: string;
  description?: string | null;
  prerequisites: string[];
  corequisites: string[];
}

const generateSQL = () => {
  const files = [
    'subjects-data-template-BSIS.json',
    'subjects-data-template-BTVTED.json'
  ];

  let sql = '-- Generated SQL Import Script\n';
  sql += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

  // Clear existing data (matching import-subjects.ts logic)
  sql += '-- Clear existing data\n';
  sql += 'DELETE FROM enrollments;\n';
  sql += 'DELETE FROM schedules;\n';
  sql += 'DELETE FROM course_sections;\n';
  sql += 'DELETE FROM subject_prerequisites;\n';
  sql += 'DELETE FROM subjects;\n\n';

  // We don't delete departments, but we ensure they exist.
  // BSIS
  sql += `-- Ensure Departments Exist\n`;
  sql += `INSERT INTO departments (id, code, name, description, isActive) VALUES (UUID(), 'BSIS', 'Bachelor of Science in Information Systems', 'Department of BSIS', 1) ON DUPLICATE KEY UPDATE name=VALUES(name);\n`;
  sql += `INSERT INTO departments (id, code, name, description, isActive) VALUES (UUID(), 'BTVTED', 'Bachelor of Technical-Vocational Teacher Education', 'Department of BTVTED', 1) ON DUPLICATE KEY UPDATE name=VALUES(name);\n\n`;

  // Process Files
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    const rawData: RawSubject[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Group 1: Insert Subjects
    sql += `-- Insert Subjects from ${file}\n`;
    for (const item of rawData) {
      const code = item.code.trim().replace(/'/g, "''");
      const name = item.name.replace(/'/g, "''");
      const desc = item.description ? `'${item.description.replace(/'/g, "''")}'` : 'NULL';
      const lectureHours = item.lectureHours ?? item.lectureUnits ?? 0;
      const labHours = item.labHours ?? item.labUnits ?? 0;
      const deptCode = item.departmentCode;

      // We use subquery for departmentId
      sql += `INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), '${code}', '${name}', ${item.units}, ${lectureHours}, ${labHours}, ${desc}, 1, (SELECT id FROM departments WHERE code = '${deptCode}' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);\n`;
    }
    sql += '\n';
  }

  // Group 2: Insert Prerequisites
  sql += '-- Insert Prerequisites\n';
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) continue;

    const rawData: RawSubject[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const item of rawData) {
      const subjectCode = item.code.trim().replace(/'/g, "''");

      const processPrereqs = (list: string[], category: 'REQUIRED' | 'COREQUISITE') => {
        if (!list || list.length === 0) return;
        
        for (const p of list) {
            const prereqCode = p.trim().replace(/'/g, "''");
            if (!prereqCode || prereqCode.toUpperCase() === 'NONE' || prereqCode.toUpperCase() === 'N/A') continue;

            // Handle potential variations (simple trim/case handled by MySQL usually, but let's be direct)
            // Using INSERT IGNORE to avoid duplicates if any
            // We need to handle the case where the prereq code might have slight spacing diffs if the original script did fuzzy matching.
            // For SQL generation, we assume exact match or simple trim match.
            
            // Subqueries to find IDs
            const categoryValue = category === 'REQUIRED' ? 'required' : 'corequisite';
            sql += `INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, '${categoryValue}' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = '${prereqCode}' 
                    WHERE s1.code = '${subjectCode}';\n`;
        }
      };

      processPrereqs(item.prerequisites, 'REQUIRED');
      processPrereqs(item.corequisites, 'COREQUISITE');
    }
  }

  sql += '\nSET FOREIGN_KEY_CHECKS = 1;\n';
  
  fs.writeFileSync(path.join(__dirname, 'import_subjects.sql'), sql);
  console.log('SQL generated at api/scripts/import_subjects.sql');
};

generateSQL();
