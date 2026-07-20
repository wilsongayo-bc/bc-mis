import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';

const router = Router();

router.get('/inspect', async (req: Request, res: Response) => {
  try {
    const queryRunner = AppDataSource.createQueryRunner();
    
    // Get all tables
    const tables = await queryRunner.query('SHOW TABLES');
    
    // Check for migration tables
    const migrationTables = await queryRunner.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE '%migration%'
    `, [process.env.DB_DATABASE]);
    
    // Check record counts
    const userCount = await queryRunner.query('SELECT COUNT(*) as count FROM users');
    const studentCount = await queryRunner.query('SELECT COUNT(*) as count FROM students');
    const employeeCount = await queryRunner.query('SELECT COUNT(*) as count FROM employees');
    
    // Check for orphaned records
    const orphanedStudents = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM students s 
      LEFT JOIN users u ON s.userId = u.id 
      WHERE u.id IS NULL
    `);
    
    const orphanedEmployees = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM employees e 
      LEFT JOIN users u ON e.userId = u.id 
      WHERE u.id IS NULL
    `);
    
    const orphanedUsers = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM users u 
      LEFT JOIN students s ON u.id = s.userId 
      LEFT JOIN employees e ON u.id = e.userId 
      WHERE s.userId IS NULL AND e.userId IS NULL
    `);
    
    await queryRunner.release();
    
    const result = {
      database: process.env.DB_DATABASE,
      tables: {
        total: tables.length,
        list: tables.map((t: Record<string, unknown>) => Object.values(t)[0])
      },
      migrationTables: migrationTables.map((t: Record<string, unknown>) => t.TABLE_NAME),
      recordCounts: {
        users: userCount[0].count,
        students: studentCount[0].count,
        employees: employeeCount[0].count
      },
      dataIntegrity: {
        orphanedStudents: orphanedStudents[0].count,
        orphanedEmployees: orphanedEmployees[0].count,
        orphanedUsers: orphanedUsers[0].count
      }
    };
    
    res.json(result);
  } catch (error) {
    console.error('Database inspection error:', error);
    res.status(500).json({ error: 'Failed to inspect database', details: error.message });
  }
});

export default router;