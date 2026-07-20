
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixEnum() {
  try {
    console.log('Connecting to database (custom connection)...');
    
    const dataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      synchronize: false, // CRITICAL: Do not sync schema automatically
      logging: true,
      entities: [], // No entities needed for raw queries
    });

    await dataSource.initialize();
    console.log('Connected.');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    
    console.log('Step 1: Expanding Enum to include ENROLLED and REGISTERED...');
    // We need to make sure the column can hold 'ENROLLED' temporarily if it's not already there
    // and add 'REGISTERED' so we can migrate to it.
    try {
        await queryRunner.query(`
        ALTER TABLE students 
        MODIFY COLUMN registrationStatus ENUM('PRE_REGISTERED', 'VERIFIED', 'ENROLLED', 'REGISTERED') 
        DEFAULT 'PRE_REGISTERED' NOT NULL
        `);
    } catch (e) {
        console.log('Step 1 warning:', (e as Error).message);
    }

    console.log('Step 2: Updating ENROLLED data to REGISTERED...');
    const result = await queryRunner.query(`
      UPDATE students 
      SET registrationStatus = 'REGISTERED' 
      WHERE registrationStatus = 'ENROLLED'
    `);
    console.log('Rows updated:', result.affectedRows);

    console.log('Step 3: Restricting Enum to remove ENROLLED...');
    await queryRunner.query(`
      ALTER TABLE students 
      MODIFY COLUMN registrationStatus ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED') 
      DEFAULT 'PRE_REGISTERED' NOT NULL
    `);

    console.log('✅ Enum fix completed successfully.');

    await queryRunner.release();
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error fixing enum:', error);
    process.exit(1);
  }
}

fixEnum();
