import { Router, Request, Response, IRouter } from 'express';
import { AppDataSource } from '../config/database';
import { Position } from '../entities/Position';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { Like, FindOptionsWhere } from 'typeorm';

const router: IRouter = Router();
const positionRepository = AppDataSource.getRepository(Position);

/**
 * GET /api/positions
 * Get all positions with filtering, pagination, and search
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const isActive = req.query.isActive as string;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions: FindOptionsWhere<Position> = {};

    if (search) {
      whereConditions.name = Like(`%${search}%`);
    }

    if (isActive !== undefined) {
      whereConditions.isActive = isActive === 'true';
    }

    const [positions, totalCount] = await positionRepository.findAndCount({
      where: whereConditions,
      order: { name: 'ASC' },
      skip: offset,
      take: limit
    });

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: positions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch positions'
    });
  }
});

/**
 * GET /api/positions/active
 * Get all active positions for dropdown lists
 * Accessible by: All authenticated users
 */
router.get('/active', authenticateToken, async (req: Request, res: Response) => {
  try {
    const positions = await positionRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
      select: ['id', 'name', 'description']
    });

    res.json({
      success: true,
      data: positions
    });
  } catch (error) {
    console.error('Error fetching active positions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active positions'
    });
  }
});

/**
 * GET /api/positions/:id
 * Get a specific position by ID
 * Accessible by: ADMIN, REGISTRAR
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const position = await positionRepository.findOne({ where: { id } });
    
    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }

    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    console.error('Error fetching position:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch position'
    });
  }
});

/**
 * POST /api/positions
 * Create a new position
 * Accessible by: ADMIN only
 */
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, isActive = true } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Position name is required'
      });
    }

    // Check if position already exists
    const existingPosition = await positionRepository.findOne({ where: { name } });
    if (existingPosition) {
      return res.status(409).json({
        success: false,
        message: 'Position with this name already exists'
      });
    }

    // Create new position
    const newPosition = positionRepository.create({
      name,
      description: description || null,
      isActive
    });

    await positionRepository.save(newPosition);

    res.status(201).json({
      success: true,
      message: 'Position created successfully',
      data: newPosition
    });
  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create position'
    });
  }
});

/**
 * PUT /api/positions/:id
 * Update a position
 * Accessible by: ADMIN only
 */
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;
    
    const position = await positionRepository.findOne({ where: { id } });
    
    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }

    // Check for name conflicts if name is being updated
    if (name && name !== position.name) {
      const existingPosition = await positionRepository.findOne({ where: { name } });
      if (existingPosition) {
        return res.status(409).json({
          success: false,
          message: 'Position with this name already exists'
        });
      }
    }

    // Update position fields
    if (name) position.name = name;
    if (description !== undefined) position.description = description || null;
    if (typeof isActive === 'boolean') position.isActive = isActive;

    await positionRepository.save(position);

    res.json({
      success: true,
      message: 'Position updated successfully',
      data: position
    });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update position'
    });
  }
});

/**
 * DELETE /api/positions/:id
 * Delete a position
 * Accessible by: ADMIN only
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const position = await positionRepository.findOne({ where: { id } });
    
    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }

    await positionRepository.remove(position);

    res.json({
      success: true,
      message: 'Position deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete position'
    });
  }
});

export default router;