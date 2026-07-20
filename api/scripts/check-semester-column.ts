// Dweezil's Code - Check if semester column exists in subjects table
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkSemesterColumn() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_DATABASE || 'bc_mis',
  });

  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected.\n');

    // Check if semester column exists
    const result = await dataSource.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'subjects' AND COLUMN_NAME = 'semester'
    `, [process.env.DB_DATABASE || 'bc_mis']);

    if (result.length > 0) {
      console.log('✅ Semester column EXISTS in subjects table:');
      console.log('   Column Name:', result[0].COLUMN_NAME);
      console.log('   Data Type:', result[0].DATA_TYPE);
      console.log('   Column Type:', result[0].COLUMN_TYPE);
      console.log('   Nullable:', result[0].IS_NULLABLE);
      console.log('\n✅ The migration has already been applied!');
    } else {
      console.log('❌ Semester column DOES NOT EXIST in subjects table');
      console.log('   The migration needs to be applied.');
      console.log('\n📝 To fix this, you can:');
      console.log('   1. Delete the migration record from the migrations table');
      console.log('   2. Run npm run migrate again');
      console.log('\n   Or run this SQL directly:');
      console.log('   ALTER TABLE subjects ADD COLUMN semester ENUM(\'First Semester\', \'Second Semester\', \'Summer\') NULL AFTER yearLevel;');
    }

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSemesterColumn();
