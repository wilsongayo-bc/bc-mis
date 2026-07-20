import { Router, Request, Response, IRouter } from 'express';
import { AppDataSource } from '../config/database';
import { GradeLevel } from '../entities/GradeLevel';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '../entities/User';

const router: IRouter = Router();
const gradeLevelRepository = AppDataSource.getRepository(GradeLevel);

/**
 * GET /api/grade-levels
 * Get all grade levels
 * Accessible by: All authenticated users
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { isActive = 'true' } = req.query;
    
    const whereConditions: Record<string, boolean> = {};
    if (isActive !== '') {
      whereConditions.isActive = isActive === 'true';
    }

    const gradeLevels = await gradeLevelRepository.find({
      where: whereConditions,
      order: { levelOrder: 'ASC' }
    });

    res.json({
      success: true,
      data: gradeLevels
    });
  } catch (error) {
    console.error('Error fetching grade levels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grade levels'
    });
  }
});

/**
 * GET /api/grade-levels/:id
 * Get a specific grade level by ID
 * Accessible by: All authenticated users
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const gradeLevel = await gradeLevelRepository.findOne({
      where: { id },
      relations: ['students']
    });

    if (!gradeLevel) {
      return res.status(404).json({
        success: false,
        message: 'Grade level not found'
      });
    }

    res.json({
      success: true,
      data: gradeLevel
    });
  } catch (error) {
    console.error('Error fetching grade level:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grade level'
    });
  }
});

/**
 * POST /api/grade-levels
 * Create a new grade level
 * Accessible by: ADMIN, REGISTRAR
 */
router.post('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      levelOrder,
      minAge,
      maxAge,
      maxStudents = 30,
      academicYear,
      isActive = true
    } = req.body;

    if (!name || !academicYear || !levelOrder) {
      return res.status(400).json({
        success: false,
        message: 'Name, academicYear and levelOrder are required'
      });
    }

    if (maxStudents <= 0) {
      return res.status(400).json({
        success: false,
        message: 'maxStudents must be greater than 0'
      });
    }

    if (minAge && maxAge && minAge > maxAge) {
      return res.status(400).json({
        success: false,
        message: 'minAge cannot be greater than maxAge'
      });
    }

    const existingByName = await gradeLevelRepository.findOne({ where: { name } });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: 'Grade level with this name already exists'
      });
    }

    const gradeLevel = gradeLevelRepository.create({
      name,
      description,
      levelOrder,
      minAge,
      maxAge,
      maxStudents,
      academicYear,
      isActive
    });

    const saved = await gradeLevelRepository.save(gradeLevel);

    res.status(201).json({
      success: true,
      data: saved,
      message: 'Grade level created successfully'
    });
  } catch (error) {
    console.error('Error creating grade level:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create grade level'
    });
  }
});

/**
 * PUT /api/grade-levels/:id
 * Update an existing grade level
 * Accessible by: ADMIN, REGISTRAR
 */
router.put('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      levelOrder,
      minAge,
      maxAge,
      maxStudents,
      academicYear,
      isActive
    } = req.body;

    const gradeLevel = await gradeLevelRepository.findOne({ where: { id } });

    if (!gradeLevel) {
      return res.status(404).json({
        success: false,
        message: 'Grade level not found'
      });
    }

    if (name && name !== gradeLevel.name) {
      const existingByName = await gradeLevelRepository.findOne({ where: { name } });
      if (existingByName) {
        return res.status(409).json({
          success: false,
          message: 'Grade level with this name already exists'
        });
      }
    }

    if (maxStudents !== undefined && maxStudents <= 0) {
      return res.status(400).json({
        success: false,
        message: 'maxStudents must be greater than 0'
      });
    }

    if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) {
      return res.status(400).json({
        success: false,
        message: 'minAge cannot be greater than maxAge'
      });
    }

    if (name !== undefined) gradeLevel.name = name;
    if (description !== undefined) gradeLevel.description = description;
    if (levelOrder !== undefined) gradeLevel.levelOrder = levelOrder;
    if (minAge !== undefined) gradeLevel.minAge = minAge;
    if (maxAge !== undefined) gradeLevel.maxAge = maxAge;
    if (maxStudents !== undefined) gradeLevel.maxStudents = maxStudents;
    if (academicYear !== undefined) gradeLevel.academicYear = academicYear;
    if (isActive !== undefined) gradeLevel.isActive = isActive;

    const updated = await gradeLevelRepository.save(gradeLevel);

    res.json({
      success: true,
      data: updated,
      message: 'Grade level updated successfully'
    });
  } catch (error) {
    console.error('Error updating grade level:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update grade level'
    });
  }
});

/**
 * DELETE /api/grade-levels/:id
 * Soft delete a grade level by setting isActive to false
 * Accessible by: ADMIN
 */
router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const gradeLevel = await gradeLevelRepository.findOne({
      where: { id },
      relations: ['students']
    });

    if (!gradeLevel) {
      return res.status(404).json({
        success: false,
        message: 'Grade level not found'
      });
    }

    const students = gradeLevel.students || [];
    if (students.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete grade level with existing students. Please reassign students first.'
      });
    }

    gradeLevel.isActive = false;
    await gradeLevelRepository.save(gradeLevel);

    res.json({
      success: true,
      message: 'Grade level deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting grade level:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete grade level'
    });
  }
});

export default router;
