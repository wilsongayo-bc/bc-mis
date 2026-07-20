import express, { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Fee } from '../entities/Fee';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '../entities/User';

const router = express.Router();
const feeRepository = AppDataSource.getRepository(Fee);

// Get all fees with filters
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courseId, yearLevel, type, isActive } = req.query;
    
    const query = feeRepository.createQueryBuilder('fee')
      .leftJoinAndSelect('fee.course', 'course')
      .orderBy('fee.createdAt', 'DESC');

    if (courseId) {
      query.andWhere('fee.courseId = :courseId OR fee.courseId IS NULL', { courseId });
    }

    if (yearLevel) {
      query.andWhere('fee.yearLevel = :yearLevel OR fee.yearLevel IS NULL', { yearLevel });
    }

    if (type) {
      query.andWhere('fee.type = :type', { type });
    }

    if (isActive !== undefined) {
      query.andWhere('fee.isActive = :isActive', { isActive: isActive === 'true' });
    }

    const fees = await query.getMany();
    res.json({ success: true, data: fees });
  } catch (error) {
    console.error('Error fetching fees:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fees' });
  }
});

// Create a fee
router.post('/', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const fee = feeRepository.create(req.body);
    await feeRepository.save(fee);
    res.status(201).json({ success: true, data: fee });
  } catch (error) {
    console.error('Error creating fee:', error);
    res.status(500).json({ success: false, message: 'Failed to create fee' });
  }
});

// Update a fee
router.put('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fee = await feeRepository.findOneBy({ id });
    
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }

    feeRepository.merge(fee, req.body);
    await feeRepository.save(fee);
    res.json({ success: true, data: fee });
  } catch (error) {
    console.error('Error updating fee:', error);
    res.status(500).json({ success: false, message: 'Failed to update fee' });
  }
});

// Delete a fee (soft delete by setting inactive or hard delete?)
// Let's implement hard delete for now as it's a setup entity
router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await feeRepository.delete(id);
    
    if (result.affected === 0) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }

    res.json({ success: true, message: 'Fee deleted successfully' });
  } catch (error) {
    console.error('Error deleting fee:', error);
    res.status(500).json({ success: false, message: 'Failed to delete fee' });
  }
});

export default router;
