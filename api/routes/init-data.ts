/**
 * Data Initialization API Route
 * Provides endpoint for initializing default data after deployment
 */

import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { Department } from '../entities/Department';
import { Position } from '../entities/Position';
import { Course } from '../entities/Course';
import { Subject } from '../entities/Subject';
import bcrypt from 'bcrypt';

const router = Router();

/**
 * Initialize default data
 * POST /api/init-data
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Check if database connection is established
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if admin user already exists
      const existingAdmin = await queryRunner.manager.findOne(User, {
        where: { email: 'admin@benedictcollege.com' }
      });

      if (existingAdmin) {
        await queryRunner.rollbackTransaction();
        return res.status(200).json({
          success: true,
          message: 'Default data already initialized',
          data: {
            adminExists: true,
            skipped: true
          }
        });
      }

      // Get existing data counts
      const departmentCount = await queryRunner.manager.count(Department);
      const positionCount = await queryRunner.manager.count(Position);
      const courseCount = await queryRunner.manager.count(Course);
      const subjectCount = await queryRunner.manager.count(Subject);

      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = queryRunner.manager.create(User, {
        username: 'admin',
        email: 'admin@benedictcollege.com',
        firstName: 'System',
        lastName: 'Administrator',
        middleInitial: 'A',
        position: 'System Administrator',
        role: UserRole.ADMIN,
        password: hashedPassword,
        isActive: true
      });

      await queryRunner.manager.save(User, adminUser);

      // Create faculty user if departments exist
      let facultyUser = null;
      if (departmentCount > 0) {
        const firstDepartment = await queryRunner.manager.findOne(Department, {
          order: { id: 'ASC' }
        });

        if (firstDepartment) {
          facultyUser = queryRunner.manager.create(User, {
            username: 'faculty',
            email: 'faculty@benedictcollege.com',
            firstName: 'Sample',
            lastName: 'Faculty',
            middleInitial: 'F',
            position: 'Instructor',
            role: UserRole.TEACHER,
            password: hashedPassword,
            isActive: true
          });

          await queryRunner.manager.save(User, facultyUser);
        }
      }

      // Create staff user if positions exist
      let staffUser = null;
      if (positionCount > 0) {
        const firstPosition = await queryRunner.manager.findOne(Position, {
          order: { id: 'ASC' }
        });

        if (firstPosition) {
          staffUser = queryRunner.manager.create(User, {
            username: 'staff',
            email: 'staff@benedictcollege.com',
            firstName: 'Sample',
            lastName: 'Staff',
            middleInitial: 'S',
            position: 'Administrative Staff',
            role: UserRole.STAFF,
            password: hashedPassword,
            isActive: true
          });

          await queryRunner.manager.save(User, staffUser);
        }
      }

      await queryRunner.commitTransaction();

      res.status(201).json({
        success: true,
        message: 'Default data initialized successfully',
        data: {
          usersCreated: {
            admin: adminUser.email,
            faculty: facultyUser?.email || null,
            staff: staffUser?.email || null
          },
          existingData: {
            departments: departmentCount,
            positions: positionCount,
            courses: courseCount,
            subjects: subjectCount
          },
          credentials: {
            defaultPassword: 'admin123',
            note: 'Please change default passwords after first login'
          }
        }
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

  } catch (error) {
    console.error('Data initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize default data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Check initialization status
 * GET /api/init-data/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userCount = await AppDataSource.manager.count(User);
    const departmentCount = await AppDataSource.manager.count(Department);
    const positionCount = await AppDataSource.manager.count(Position);
    const courseCount = await AppDataSource.manager.count(Course);
    const subjectCount = await AppDataSource.manager.count(Subject);

    const adminExists = await AppDataSource.manager.findOne(User, {
      where: { email: 'admin@benedictcollege.com' }
    });

    res.status(200).json({
      success: true,
      data: {
        initialized: !!adminExists,
        counts: {
          users: userCount,
          departments: departmentCount,
          positions: positionCount,
          courses: courseCount,
          subjects: subjectCount
        },
        adminExists: !!adminExists
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check initialization status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;