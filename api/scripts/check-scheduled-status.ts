// Dweezil's Code - Check if SCHEDULED status exists in students table
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkScheduledStatus() {
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

    // Check registrationStatus column definition
    const result = await dataSource.query(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND COLUMN_NAME = 'registrationStatus'
    `, [process.env.DB_DATABASE || 'bc_mis']);

    if (result.length > 0) {
      const columnType = result[0].COLUMN_TYPE;
      console.log('📋 Current registrationStatus enum values:');
      console.log('   ', columnType);
      
      if (columnType.includes('SCHEDULED')) {
        console.log('\n✅ SCHEDULED status EXISTS in registrationStatus enum!');
        console.log('   The migration has already been applied.');
      } else {
        console.log('\n❌ SCHEDULED status DOES NOT EXIST in registrationStatus enum');
        console.log('   The migration needs to be applied.');
        console.log('\n📝 Run: npm run migrate');
      }
    } else {
      console.log('❌ registrationStatus column not found');
    }

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkScheduledStatus();
