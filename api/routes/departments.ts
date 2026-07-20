import { Router, Request, Response, IRouter } from 'express';
import { AppDataSource } from '../config/database';
import { Department } from '../entities/Department';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '../entities/User';
import { Like, FindOptionsWhere } from 'typeorm';

const router: IRouter = Router();
const departmentRepository = AppDataSource.getRepository(Department);

/**
 * GET /api/departments
 * Get all departments with filtering, pagination, and search
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      isActive
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const offset = (pageNumber - 1) * limitNumber;

    // Build where conditions
    const whereConditions: FindOptionsWhere<Department> = {};

    // Search filter
    if (search) {
      whereConditions.name = Like(`%${search}%`);
    }

    // Active status filter
    if (isActive !== undefined) {
      whereConditions.isActive = isActive === 'true';
    }

    // Get departments with pagination
    const [departments, totalCount] = await departmentRepository.findAndCount({
      where: whereConditions,
      order: { name: 'ASC' },
      skip: offset,
      take: limitNumber
    });

    const totalPages = Math.ceil(totalCount / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    res.json({
      success: true,
      data: departments,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments'
    });
  }
});

/**
 * GET /api/departments/:id
 * Get a specific department by ID
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const department = await departmentRepository.findOne({
      where: { id },
      relations: ['courses']
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department'
    });
  }
});

/**
 * POST /api/departments
 * Create a new department
 * Accessible by: ADMIN, REGISTRAR
 */
router.post('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { name, code, description, isActive = true } = req.body;

    // Validation
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        error: 'Department name and code are required'
      });
    }

    // Check if department code already exists
    const existingDepartment = await departmentRepository.findOne({
      where: { code }
    });

    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        error: 'Department code already exists'
      });
    }

    // Create new department
    const department = departmentRepository.create({
      name,
      code: code.toUpperCase(),
      description,
      isActive
    });

    const savedDepartment = await departmentRepository.save(department);

    res.status(201).json({
      success: true,
      data: savedDepartment,
      message: 'Department created successfully'
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create department'
    });
  }
});

/**
 * PUT /api/departments/:id
 * Update an existing department
 * Accessible by: ADMIN, REGISTRAR
 */
router.put('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    // Find existing department
    const department = await departmentRepository.findOne({
      where: { id }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    // Check if new code conflicts with existing department (if code is being changed)
    if (code && code !== department.code) {
      const existingDepartment = await departmentRepository.findOne({
        where: { code }
      });

      if (existingDepartment) {
        return res.status(400).json({
          success: false,
          error: 'Department code already exists'
        });
      }
    }

    // Update department fields
    if (name !== undefined) department.name = name;
    if (code !== undefined) department.code = code.toUpperCase();
    if (description !== undefined) department.description = description;
    if (isActive !== undefined) department.isActive = isActive;

    const updatedDepartment = await departmentRepository.save(department);

    res.json({
      success: true,
      data: updatedDepartment,
      message: 'Department updated successfully'
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update department'
    });
  }
});

/**
 * DELETE /api/departments/:id
 * Delete a department (soft delete by setting isActive to false)
 * Accessible by: ADMIN
 */
router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find existing department
    const department = await departmentRepository.findOne({
      where: { id },
      relations: ['courses']
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    // Check if department has active courses
    const activeCourses = department.courses?.filter(course => course.isActive) || [];
    if (activeCourses.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete department with active courses. Please deactivate or reassign courses first.'
      });
    }

    // Soft delete by setting isActive to false
    department.isActive = false;
    await departmentRepository.save(department);

    res.json({
      success: true,
      message: 'Department deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete department'
    });
  }
});

/**
 * GET /api/departments/active
 * Get all active departments (for dropdowns)
 * Accessible by: All authenticated users
 */
router.get('/active/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const departments = await departmentRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
      select: ['id', 'name', 'code']
    });

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching active departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active departments'
    });
  }
});

export default router;