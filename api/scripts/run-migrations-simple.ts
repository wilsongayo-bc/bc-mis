// Dweezil's Code - Simplified migration runner with direct connection
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';

// Load .env files
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import all entities
import { User } from '../entities/User';
import { Student } from '../entities/Student';
import { Employee } from '../entities/Employee';
import { Course } from '../entities/Course';
import { CourseSection } from '../entities/CourseSection';
import { Subject } from '../entities/Subject';
import { SubjectPrerequisite } from '../entities/SubjectPrerequisite';
import { Department } from '../entities/Department';
import { Position } from '../entities/Position';
import { Enrollment } from '../entities/Enrollment';
import { Schedule } from '../entities/Schedule';
import { Payment } from '../entities/Payment';
import { Book } from '../entities/Book';
import { BorrowRecord } from '../entities/BorrowRecord';
import { Settings } from '../entities/Settings';
import { GradeLevel } from '../entities/GradeLevel';
import { DocumentCategory } from '../entities/DocumentCategory';
import { DocumentRequirement } from '../entities/DocumentRequirement';
import { StudentDocument } from '../entities/StudentDocument';
import { ReportTemplate } from '../entities/ReportTemplate';
import { ScheduledReport } from '../entities/ScheduledReport';
import { ReportCache } from '../entities/ReportCache';
import { AcademicYear } from '../entities/AcademicYear';
import { ActivityLog } from '../entities/ActivityLog';

async function runMigrations() {
  // Create a simple DataSource for migrations only
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_DATABASE || 'bc_mis',
    synchronize: false,
    logging: true,
    entities: [
      User, Student, Employee, Course, CourseSection, Subject, SubjectPrerequisite,
      Department, Position, Enrollment, Schedule, Payment,
      Book, BorrowRecord, Settings, GradeLevel,
      DocumentCategory, DocumentRequirement, StudentDocument,
      ReportTemplate, ScheduledReport, ReportCache, AcademicYear, ActivityLog
    ],
    migrations: [path.join(__dirname, '../migrations/**/*{.ts,.js}')],
    extra: {
      connectionLimit: 5,
      connectTimeout: 60000,
      acquireTimeout: 60000,
      timeout: 60000
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    console.log('   Host:', dataSource.options.type === 'mysql' ? (dataSource.options as { host: string }).host : 'N/A');
    console.log('   Port:', dataSource.options.type === 'mysql' ? (dataSource.options as { port: number }).port : 'N/A');
    console.log('   Database:', dataSource.options.type === 'mysql' ? (dataSource.options as { database: string }).database : 'N/A');
    console.log('   Username:', dataSource.options.type === 'mysql' ? (dataSource.options as { username: string }).username : 'N/A');

    await dataSource.initialize();
    console.log('✅ Database connected.');

    console.log('🔄 Running migrations...');
    const migrations = await dataSource.runMigrations({ transaction: 'all' });
    
    if (migrations.length > 0) {
      console.log(`✅ Executed ${migrations.length} migration(s):`);
      for (const migration of migrations) {
        console.log(`   - ${migration.name}`);
      }
    } else {
      console.log('ℹ️  No pending migrations to run.');
    }

    await dataSource.destroy();
    console.log('✅ Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    if (error.code) console.error('   Error code:', error.code);
    if (error.errno) console.error('   Error number:', error.errno);
    if (error.sqlMessage) console.error('   SQL message:', error.sqlMessage);
    process.exit(1);
  }
}

runMigrations();
