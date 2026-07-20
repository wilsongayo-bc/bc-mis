import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

// Load environment variables
dotenv.config();

async function fixStudentIdNullable() {
  console.log('Starting studentId nullable fix...');
  console.log('Environment variables:', {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD ? '***' : 'undefined',
    DB_DATABASE: process.env.DB_DATABASE
  });

  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'letmein25',
    database: process.env.DB_DATABASE || 'bc_mis',
    entities: [], // Empty entities array to avoid relationship issues
    synchronize: false,
    logging: true
  });

  try {
    await dataSource.initialize();
    console.log('Database connected successfully');

    const queryRunner = dataSource.createQueryRunner();
    
    try {
      // Check current column definition
      console.log('Checking current studentId column definition...');
      const columnInfo = await queryRunner.query(`
        SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'students' 
        AND COLUMN_NAME = 'studentId'
      `, [process.env.DB_DATABASE || 'bc_mis']);
      
      console.log('Current studentId column info:', columnInfo);
      
      if (columnInfo.length > 0 && columnInfo[0].IS_NULLABLE === 'NO') {
        console.log('Making studentId column nullable...');
        
        // Make studentId nullable
        await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`studentId\` varchar(20) NULL`);
        
        console.log('Successfully made studentId column nullable');
        
        // Verify the change
        const updatedColumnInfo = await queryRunner.query(`
          SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, COLUMN_TYPE 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? 
          AND TABLE_NAME = 'students' 
          AND COLUMN_NAME = 'studentId'
        `, [process.env.DB_DATABASE || 'bc_mis']);
        
        console.log('Updated studentId column info:', updatedColumnInfo);
      } else {
        console.log('studentId column is already nullable or does not exist');
      }
      
    } finally {
      await queryRunner.release();
    }
    
  } catch (error) {
    console.error('Error fixing studentId column:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Run the fix
fixStudentIdNullable()
  .then(() => {
    console.log('Fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix failed:', error);
    process.exit(1);
  });