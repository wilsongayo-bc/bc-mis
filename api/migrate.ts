/**
 * Vercel serverless function for database migrations
 */
import 'reflect-metadata';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { Student } from './entities/Student';
import { GradeLevel } from './entities/GradeLevel';
import { Employee } from './entities/Employee';
import { Course } from './entities/Course';
import { Subject } from './entities/Subject';
import { Enrollment } from './entities/Enrollment';
import { Payment } from './entities/Payment';
import { Book } from './entities/Book';
import { BorrowRecord } from './entities/BorrowRecord';
import { Schedule } from './entities/Schedule';
import { Settings } from './entities/Settings';
import { Department } from './entities/Department';
import { Position } from './entities/Position';

const entities = [
  User,
  Student,
  GradeLevel,
  Employee,
  Course,
  Subject,
  Enrollment,
  Payment,
  Book,
  BorrowRecord,
  Schedule,
  Settings,
  Department,
  Position
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic security check - require migration key
  const migrationKey = req.headers['x-migration-key'] || req.body?.migrationKey;
  const expectedKey = process.env.MIGRATION_KEY || 'bc-migrate-2025';
  
  if (migrationKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid migration key' });
  }

  try {
    console.log('🔄 Starting database migration...');
    
    // Create data source
    const dataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities,
      synchronize: true, // This will create tables automatically
      logging: true,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('📡 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected successfully');

    // Check if tables exist
    const queryRunner = dataSource.createQueryRunner();
    const tables = await queryRunner.getTables();
    console.log(`📊 Found ${tables.length} tables:`, tables.map(t => t.name));

    await queryRunner.release();
    await dataSource.destroy();

    return res.status(200).json({
      success: true,
      message: 'Database migration completed successfully',
      tablesCreated: tables.length,
      tableNames: tables.map(t => t.name)
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        database: process.env.DB_DATABASE,
        hasPassword: !!process.env.DB_PASSWORD
      }
    });
  }
}