import { Router, Request, Response, IRouter } from 'express';
import { AppDataSource } from '../config/database';
import { Bank } from '../entities/Bank';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '../entities/User';

const router: IRouter = Router();
const bankRepository = AppDataSource.getRepository(Bank);

/**
 * GET /api/banks
 * Get all active banks
 * Accessible by: ALL
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const banks = await bankRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' }
    });

    res.json({
      success: true,
      data: banks
    });
  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banks'
    });
  }
});

/**
 * GET /api/banks/all
 * Get all banks (including inactive)
 * Accessible by: ADMIN
 */
router.get('/all', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const banks = await bankRepository.find({
      order: { name: 'ASC' }
    });

    res.json({
      success: true,
      data: banks
    });
  } catch (error) {
    console.error('Error fetching all banks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banks'
    });
  }
});

/**
 * POST /api/banks
 * Create a new bank
 * Accessible by: ADMIN
 */
router.post('/', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { name, code } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Bank name is required'
      });
    }

    const existingBank = await bankRepository.findOne({ where: { name } });
    if (existingBank) {
      return res.status(400).json({
        success: false,
        message: 'Bank already exists'
      });
    }

    const bank = bankRepository.create({
      name,
      code,
      isActive: true
    });

    await bankRepository.save(bank);

    res.status(201).json({
      success: true,
      data: bank,
      message: 'Bank created successfully'
    });
  } catch (error) {
    console.error('Error creating bank:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bank'
    });
  }
});

/**
 * PATCH /api/banks/:id
 * Update a bank
 * Accessible by: ADMIN
 */
router.patch('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, isActive } = req.body;

    const bank = await bankRepository.findOne({ where: { id } });
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: 'Bank not found'
      });
    }

    if (name) bank.name = name;
    if (code !== undefined) bank.code = code;
    if (isActive !== undefined) bank.isActive = isActive;

    await bankRepository.save(bank);

    res.json({
      success: true,
      data: bank,
      message: 'Bank updated successfully'
    });
  } catch (error) {
    console.error('Error updating bank:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bank'
    });
  }
});

/**
 * DELETE /api/banks/:id
 * Delete a bank (soft delete by deactivating)
 * Accessible by: ADMIN
 */
router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const bank = await bankRepository.findOne({ where: { id } });
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: 'Bank not found'
      });
    }

    // Hard delete if not used, otherwise soft delete
    // For now, we'll just soft delete
    bank.isActive = false;
    await bankRepository.save(bank);

    res.json({
      success: true,
      message: 'Bank deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting bank:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank'
    });
  }
});

export default router;
