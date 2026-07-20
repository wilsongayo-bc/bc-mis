
import mysql from 'mysql2/promise';

async function debugSubjectQuery() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'letmein25',
      database: 'bc_mis'
    });

    const searchTerm = "%Science%";
    console.log(`Executing complex query for "${searchTerm}"...`);
    
    const query = `
      SELECT subject.id, subject.code, subject.name, subject.description 
      FROM subjects subject
      LEFT JOIN departments department ON department.id = subject.departmentId
      LEFT JOIN courses course ON course.id = subject.courseId
      WHERE (subject.name LIKE ? OR subject.code LIKE ? OR subject.description LIKE ? OR department.name LIKE ? OR course.name LIKE ?)
      LIMIT 100
    `;

    const [rows] = await connection.execute(query, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]);
    
    const subjects = rows as mysql.RowDataPacket[];
    console.log(`Found ${subjects.length} subjects:`);
    subjects.forEach(s => {
      console.log(`- [${s.code}] ${s.name}`);
    });

    await connection.end();
  } catch (error) {
    console.error(error);
  }
}

debugSubjectQuery();
