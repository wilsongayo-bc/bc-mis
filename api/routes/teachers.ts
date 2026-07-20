import { Router, Response, IRouter } from 'express';
import { AppDataSource } from '../config/database';
import { Employee } from '../entities/Employee';
import { Schedule } from '../entities/Schedule';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '../entities/User';

const router: IRouter = Router();
const employeeRepository = AppDataSource.getRepository(Employee);
const scheduleRepository = AppDataSource.getRepository(Schedule);

/**
 * GET /api/teachers/profile
 * Get current teacher's profile
 * Accessible by: TEACHER
 */
router.get('/profile', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const teacher = await employeeRepository.findOne({
      where: { userId },
      relations: ['user']
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    res.json({
      success: true,
      data: teacher
    });
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher profile'
    });
  }
});

/**
 * GET /api/teachers/loads
 * Get current teacher's class loads (schedules)
 * Accessible by: TEACHER
 */
router.get('/loads', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const teacher = await employeeRepository.findOne({
      where: { userId }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Fetch schedules where this teacher is assigned
    const schedules = await scheduleRepository.find({
      where: { teacherId: teacher.id, isActive: true },
      relations: ['subject', 'courseSection', 'courseSection.course'],
      order: {
        dayOfWeek: 'ASC',
        startTime: 'ASC'
      }
    });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching teacher loads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher loads'
    });
  }
});

export default router;
