import { Router, Request, Response, IRouter } from 'express';
import { AppDataSource } from '../config/database';
import { DocumentCategory } from '../entities/DocumentCategory';
import { UserRole } from '../entities/User';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: IRouter = Router();
const documentCategoryRepository = AppDataSource.getRepository(DocumentCategory);

/**
 * GET /api/document-categories
 * Get all document categories
 * Accessible by: ADMIN, REGISTRAR
 */
router.get('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      sortBy = 'sortOrder',
      sortOrder = 'ASC',
      includeInactive = 'false'
    } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const offset = (pageNumber - 1) * limitNumber;

    // Build query
    let queryBuilder = documentCategoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.requirements', 'requirements');

    // Filter by active status
    if (includeInactive !== 'true') {
      queryBuilder = queryBuilder.where('category.isActive = :isActive', { isActive: true });
    }

    // Add search functionality
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(category.name LIKE :search OR category.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add sorting
    const validSortFields = ['sortOrder', 'name', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'sortOrder';
    const order = sortOrder === 'DESC' ? 'DESC' : 'ASC';
    
    queryBuilder = queryBuilder.orderBy(`category.${sortField}`, order);

    // Get total count for pagination
    const totalCount = await queryBuilder.getCount();

    // Apply pagination
    const categories = await queryBuilder
      .skip(offset)
      .take(limitNumber)
      .getMany();

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    res.json({
      success: true,
      data: categories,
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
    console.error('❌ Error fetching document categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document categories',
      error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    });
  }
});

/**
 * GET /api/document-categories/:id
 * Get a specific document category by ID
 * Accessible by: ADMIN, REGISTRAR
 */
router.get('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await documentCategoryRepository.findOne({
      where: { id },
      relations: ['requirements']
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Document category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching document category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document category'
    });
  }
});

/**
 * POST /api/document-categories
 * Create a new document category
 * Accessible by: ADMIN, REGISTRAR
 */
router.post('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { name, description, color, sortOrder, isActive } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Check if category with same name already exists
    const existingCategory = await documentCategoryRepository.findOne({
      where: { name }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists'
      });
    }

    // Create new category
    const category = documentCategoryRepository.create({
      name,
      description,
      color: color || '#3B82F6',
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    const savedCategory = await documentCategoryRepository.save(category);

    res.status(201).json({
      success: true,
      data: savedCategory,
      message: 'Document category created successfully'
    });
  } catch (error) {
    console.error('Error creating document category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create document category'
    });
  }
});

/**
 * PUT /api/document-categories/:id
 * Update a document category
 * Accessible by: ADMIN, REGISTRAR
 */
router.put('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, color, sortOrder, isActive } = req.body;

    const category = await documentCategoryRepository.findOne({
      where: { id }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Document category not found'
      });
    }

    // Check if another category with same name exists (excluding current one)
    if (name && name !== category.name) {
      const existingCategory = await documentCategoryRepository.findOne({
        where: { name }
      });

      if (existingCategory && existingCategory.id !== id) {
        return res.status(400).json({
          success: false,
          message: 'A category with this name already exists'
        });
      }
    }

    // Update category
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (color !== undefined) category.color = color;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (isActive !== undefined) category.isActive = isActive;

    const updatedCategory = await documentCategoryRepository.save(category);

    res.json({
      success: true,
      data: updatedCategory,
      message: 'Document category updated successfully'
    });
  } catch (error) {
    console.error('Error updating document category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document category'
    });
  }
});

/**
 * DELETE /api/document-categories/:id
 * Delete a document category
 * Accessible by: ADMIN, REGISTRAR
 */
router.delete('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await documentCategoryRepository.findOne({
      where: { id },
      relations: ['requirements']
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Document category not found'
      });
    }

    // Check if category has associated requirements
    if (category.requirements && category.requirements.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that has associated document requirements. Please reassign or delete the requirements first.'
      });
    }

    await documentCategoryRepository.remove(category);

    res.json({
      success: true,
      message: 'Document category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document category'
    });
  }
});

/**
 * PATCH /api/document-categories/:id/toggle-status
 * Toggle active status of a document category
 * Accessible by: ADMIN, REGISTRAR
 */
router.patch('/:id/toggle-status', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await documentCategoryRepository.findOne({
      where: { id }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Document category not found'
      });
    }

    category.isActive = !category.isActive;
    const updatedCategory = await documentCategoryRepository.save(category);

    res.json({
      success: true,
      data: updatedCategory,
      message: `Document category ${updatedCategory.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling document category status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle document category status'
    });
  }
});

/**
 * POST /api/document-categories/seed-sample-data
 * Seed sample document categories
 * Accessible by: ADMIN, REGISTRAR
 */
router.post('/seed-sample-data', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    let created = 0, skipped = 0;
    const errors: string[] = [];

    const categories = [
      {
        name: 'Academic Records',
        description: 'Official academic documents including transcripts, diplomas, certificates, and grade reports',
        color: '#10B981', // Green
        sortOrder: 0,
        isActive: true
      },
      {
        name: 'Enrollment Documents',
        description: 'Documents required for student enrollment and registration processes',
        color: '#3B82F6', // Blue
        sortOrder: 1,
        isActive: true
      },
      {
        name: 'Financial Records',
        description: 'Payment receipts, financial statements, tuition records, and billing documents',
        color: '#F59E0B', // Yellow/Amber
        sortOrder: 2,
        isActive: true
      },
      {
        name: 'Personal Documents',
        description: 'Personal identification documents, photos, birth certificates, and medical records',
        color: '#8B5CF6', // Purple
        sortOrder: 3,
        isActive: true
      },
      {
        name: 'Administrative Forms',
        description: 'Application forms, clearances, permits, and other administrative documents',
        color: '#F97316', // Orange
        sortOrder: 4,
        isActive: true
      },
      {
        name: 'Legal Documents',
        description: 'Contracts, legal agreements, affidavits, and other legal documentation',
        color: '#EF4444', // Red
        sortOrder: 5,
        isActive: true
      }
    ];

    for (const categoryData of categories) {
      try {
        // Check if category already exists
        const existingCategory = await documentCategoryRepository.findOne({
          where: { name: categoryData.name }
        });

        if (existingCategory) {
          skipped++;
          continue;
        }

        // Create new category
        const category = documentCategoryRepository.create(categoryData);
        await documentCategoryRepository.save(category);
        created++;
      } catch (error) {
        errors.push(`Failed to create category ${categoryData.name}: ${error}`);
      }
    }

    res.json({
      success: true,
      data: {
        created,
        skipped,
        errors
      },
      message: `Seeding completed: ${created} categories created, ${skipped} skipped${errors.length > 0 ? `, ${errors.length} errors` : ''}`
    });
  } catch (error) {
    console.error('Error seeding document categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed document categories'
    });
  }
});

export default router;