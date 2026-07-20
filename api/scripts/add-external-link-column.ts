import 'reflect-metadata';
import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'letmein25',
  database: process.env.DB_DATABASE || 'bc_mis',
  entities: ['./entities/*.ts'],
  synchronize: false,
  logging: true,
});

async function addColumn() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    // Check if column already exists
    const columns = await queryRunner.getTable('books');
    const hasExternalLink = columns?.columns.some(col => col.name === 'externalLink');
    
    if (!hasExternalLink) {
      await queryRunner.query('ALTER TABLE books ADD COLUMN externalLink VARCHAR(500) NULL');
      console.log('externalLink column added successfully');
    } else {
      console.log('externalLink column already exists');
    }
    
    await queryRunner.release();
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Failed to add column:', error);
    process.exit(1);
  }
}

addColumn();