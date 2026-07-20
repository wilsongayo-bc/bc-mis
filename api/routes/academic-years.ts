import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { AcademicYear } from '../entities/AcademicYear';
import { authenticateToken } from '../middleware/auth';
import { getCurrentAcademicYear } from '../utils/academicTerm';

const router = Router();

// Get all academic years
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const academicYearRepository = AppDataSource.getRepository(AcademicYear);
    const academicYears = await academicYearRepository.find({
      order: { year: 'DESC' }
    });

    res.json(academicYears);
  } catch (error) {
    console.error('Error fetching academic years:', error);
    res.status(500).json({ error: 'Failed to fetch academic years' });
  }
});

// Get current active academic year
router.get('/current', async (req: Request, res: Response) => {
  try {
    const academicYearRepository = AppDataSource.getRepository(AcademicYear);
    const year = await getCurrentAcademicYear();
    const currentYear = await academicYearRepository.findOne({ where: { year } });

    res.json({ 
      year,
      startDate: currentYear?.startDate,
      endDate: currentYear?.endDate
    });
  } catch (error) {
    console.error('Error fetching current academic year:', error);
    res.status(500).json({ error: 'Failed to fetch current academic year' });
  }
});

// Create new academic year
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { year, description, startDate, endDate } = req.body;

    // Validate year format
    if (!AcademicYear.validateYearFormat(year)) {
      return res.status(400).json({ 
        error: 'Invalid year format. Use YYYY-YYYY format (e.g., 2024-2025)' 
      });
    }

    const academicYearRepository = AppDataSource.getRepository(AcademicYear);

    // Check if year already exists
    const existingYear = await academicYearRepository.findOne({
      where: { year }
    });

    if (existingYear) {
      return res.status(409).json({ 
        error: 'Academic year already exists' 
      });
    }

    // Create new academic year
    const academicYear = academicYearRepository.create({
      year,
      description,
      startDate,
      endDate,
      isActive: false
    });

    const savedYear = await academicYearRepository.save(academicYear);
    res.status(201).json(savedYear);
  } catch (error) {
    console.error('Error creating academic year:', error);
    res.status(500).json({ error: 'Failed to create academic year' });
  }
});

// Update academic year
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { year, description, startDate, endDate } = req.body;

    const academicYearRepository = AppDataSource.getRepository(AcademicYear);

    const academicYear = await academicYearRepository.findOne({
      where: { id: parseInt(id) }
    });

    if (!academicYear) {
      return res.status(404).json({ error: 'Academic year not found' });
    }

    // Validate year format if provided
    if (year && !AcademicYear.validateYearFormat(year)) {
      return res.status(400).json({ 
        error: 'Invalid year format. Use YYYY-YYYY format (e.g., 2024-2025)' 
      });
    }

    // Check if new year already exists (if different from current)
    if (year && year !== academicYear.year) {
      const existingYear = await academicYearRepository.findOne({
        where: { year }
      });

      if (existingYear) {
        return res.status(409).json({ 
          error: 'Academic year already exists' 
        });
      }
    }

    // Update fields
    if (year) academicYear.year = year;
    if (description !== undefined) academicYear.description = description;
    if (startDate !== undefined) academicYear.startDate = startDate;
    if (endDate !== undefined) academicYear.endDate = endDate;

    const updatedYear = await academicYearRepository.save(academicYear);
    res.json(updatedYear);
  } catch (error) {
    console.error('Error updating academic year:', error);
    res.status(500).json({ error: 'Failed to update academic year' });
  }
});

// Set academic year as current/active
router.put('/:id/set-current', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const academicYearRepository = AppDataSource.getRepository(AcademicYear);

    // First, check if the academic year exists
    const targetYear = await academicYearRepository.findOne({
      where: { id: parseInt(id) }
    });

    if (!targetYear) {
      return res.status(404).json({ error: 'Academic year not found' });
    }

    // Start transaction to ensure only one active year
    await AppDataSource.transaction(async (manager) => {
      // First, deactivate all academic years using a proper criteria
      await manager
        .createQueryBuilder()
        .update(AcademicYear)
        .set({ isActive: false })
        .where("isActive = :isActive", { isActive: true })
        .execute();

      // Then activate the selected year
      await manager.update(
        AcademicYear, 
        { id: parseInt(id) }, 
        { isActive: true }
      );
    });

    // Fetch the updated academic year
    const updatedYear = await academicYearRepository.findOne({
      where: { id: parseInt(id) }
    });

    res.json(updatedYear);
  } catch (error) {
    console.error('Error setting current academic year:', error);
    if (error.message === 'Academic year not found') {
      res.status(404).json({ error: 'Academic year not found' });
    } else {
      res.status(500).json({ error: 'Failed to set current academic year' });
    }
  }
});

// Delete academic year
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const academicYearRepository = AppDataSource.getRepository(AcademicYear);

    const academicYear = await academicYearRepository.findOne({
      where: { id: parseInt(id) }
    });

    if (!academicYear) {
      return res.status(404).json({ error: 'Academic year not found' });
    }

    // Prevent deletion of active academic year
    if (academicYear.isActive) {
      return res.status(400).json({ 
        error: 'Cannot delete the current active academic year. Please set another year as current first.' 
      });
    }

    await academicYearRepository.remove(academicYear);
    res.json({ message: 'Academic year deleted successfully' });
  } catch (error) {
    console.error('Error deleting academic year:', error);
    res.status(500).json({ error: 'Failed to delete academic year' });
  }
});

export default router;
