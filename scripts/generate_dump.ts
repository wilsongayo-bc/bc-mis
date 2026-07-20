import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'letmein25',
  database: process.env.DB_NAME || 'bc_mis',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function generateDump() {
  console.log('Connecting to database...', DB_CONFIG.database);
  let connection;

  try {
    connection = await mysql.createConnection(DB_CONFIG);
    const tables = ['users', 'employees', 'course_sections', 'schedules'];
    let dumpContent = `-- SQL Dump for tables: ${tables.join(', ')}\n`;
    dumpContent += `-- Generated at: ${new Date().toISOString()}\n\n`;
    dumpContent += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const table of tables) {
      console.log(`Fetching data for ${table}...`);
      const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
      
      if (Array.isArray(rows) && rows.length > 0) {
        dumpContent += `-- Table: ${table}\n`;
        dumpContent += `TRUNCATE TABLE \`${table}\`;\n`;
        
        const columns = Object.keys(rows[0]);
        const insertBase = `INSERT INTO \`${table}\` (\`${columns.join('`, `')}\`) VALUES`;
        
        const values = rows.map(row => {
          const rowValues = columns.map(col => {
            const val = (row as Record<string, unknown>)[col];
            if (val === null) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? 1 : 0;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return `'${String(val).replace(/'/g, "\\'")}'`;
          });
          return `(${rowValues.join(', ')})`;
        });

        const BATCH_SIZE = 100;
        for (let i = 0; i < values.length; i += BATCH_SIZE) {
          const batch = values.slice(i, i + BATCH_SIZE);
          dumpContent += `${insertBase}\n${batch.join(',\n')};\n\n`;
        }
      } else {
        console.log(`No data found for ${table}`);
      }
    }

    dumpContent += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    const outputPath = path.join(process.cwd(), 'scripts', 'dump_local_data.sql');
    fs.writeFileSync(outputPath, dumpContent);
    console.log(`Dump created at: ${outputPath}`);

  } catch (error) {
    console.error('Error generating dump:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

generateDump();
