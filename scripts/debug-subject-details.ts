
import mysql from 'mysql2/promise';

async function debugSubject() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'letmein25',
      database: 'bc_mis'
    });

    const searchTerm = "Science";
    console.log(`Searching for "${searchTerm}"...`);
    
    // Check the specific subject
    const [rows] = await connection.execute(
      'SELECT id, code, name, description, courseId, departmentId, isActive, yearLevel FROM subjects WHERE code = ?',
      ['GE CC 108']
    );
    
    const subjects = rows as mysql.RowDataPacket[];
    if (subjects.length > 0) {
        const s = subjects[0];
        console.log('Subject Details:');
        console.log(`ID: ${s.id}`);
        console.log(`Code: ${s.code}`);
        console.log(`Name: ${s.name}`);
        console.log(`Description: ${s.description}`);
        console.log(`CourseId: ${s.courseId} (Type: ${typeof s.courseId})`);
        console.log(`DepartmentId: ${s.departmentId} (Type: ${typeof s.departmentId})`);
        console.log(`IsActive: ${s.isActive}`);
        console.log(`YearLevel: ${s.yearLevel}`);
    } else {
        console.log('Subject GE CC 108 not found.');
    }

    await connection.end();
  } catch (error) {
    console.error(error);
  }
}

debugSubject();
