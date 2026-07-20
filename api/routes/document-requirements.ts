import { Router, Response, IRouter } from 'express';
import { AppDataSource } from '../config/database';
import { DocumentRequirement, ValidationRules } from '../entities/DocumentRequirement';
import { DocumentCategory } from '../entities/DocumentCategory';
import { UserRole } from '../entities/User';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router: IRouter = Router();
const documentRequirementRepository = AppDataSource.getRepository(DocumentRequirement);
const documentCategoryRepository = AppDataSource.getRepository(DocumentCategory);

/**
 * GET /api/document-requirements
 * Get all document requirements with filtering and pagination
 * Accessible by: ADMIN, REGISTRAR
 */
router.get('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      isRequired,
      gradeLevel,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const offset = (pageNumber - 1) * limitNumber;

    // Build query
    let queryBuilder = documentRequirementRepository
      .createQueryBuilder('requirement')
      .leftJoinAndSelect('requirement.category', 'category')
      .leftJoinAndSelect('requirement.creator', 'creator');

    // Add filters
    if (categoryId) {
      queryBuilder = queryBuilder.andWhere('requirement.categoryId = :categoryId', { categoryId });
    }

    if (isRequired !== undefined) {
      queryBuilder = queryBuilder.andWhere('requirement.isRequired = :isRequired', { 
        isRequired: isRequired === 'true' 
      });
    }

    if (gradeLevel) {
      queryBuilder = queryBuilder.andWhere(
        'JSON_CONTAINS(requirement.applicableGradeLevels, :gradeLevel)',
        { gradeLevel: JSON.stringify(gradeLevel) }
      );
    }

    // Add search functionality
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(requirement.name LIKE :search OR requirement.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add sorting
    const validSortFields = ['name', 'isRequired', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    
    queryBuilder = queryBuilder.orderBy(`requirement.${sortField}`, order);

    // Get total count for pagination
    const totalCount = await queryBuilder.getCount();

    // Apply pagination
    const requirements = await queryBuilder
      .skip(offset)
      .take(limitNumber)
      .getMany();

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    res.json({
      success: true,
      data: requirements,
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
    console.error('❌ Error fetching document requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document requirements',
      error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    });
  }
});

/**
 * GET /api/document-requirements/for-registration
 * Get document requirements for student registration based on grade level
 * Accessible by: ADMIN, REGISTRAR, STUDENT
 */
router.get('/for-registration', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gradeLevel } = req.query;

    let queryBuilder = documentRequirementRepository
      .createQueryBuilder('requirement')
      .leftJoinAndSelect('requirement.category', 'category')
      .where('(category.isActive = :isActive OR requirement.categoryId IS NULL)', { isActive: true });

    // Filter by grade level if provided
    if (gradeLevel) {
      queryBuilder = queryBuilder.andWhere(
        '(requirement.applicableGradeLevels IS NULL OR JSON_CONTAINS(requirement.applicableGradeLevels, :gradeLevel))',
        { gradeLevel: JSON.stringify(gradeLevel) }
      );
    }

    // Order by category sort order and requirement name
    queryBuilder = queryBuilder
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('requirement.name', 'ASC');

    const requirements = await queryBuilder.getMany();

    // Group requirements by category
    const groupedRequirements = requirements.reduce((acc, requirement) => {
      const categoryName = requirement.category?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = {
          category: requirement.category,
          requirements: []
        };
      }
      acc[categoryName].requirements.push(requirement);
      return acc;
    }, {} as Record<string, { category: DocumentCategory | null; requirements: DocumentRequirement[] }>);

    res.json({
      success: true,
      data: {
        grouped: groupedRequirements,
        flat: requirements
      }
    });
  } catch (error) {
    console.error('❌ Error fetching registration requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registration requirements'
    });
  }
});

/**
 * GET /api/document-requirements/:id
 * Get a specific document requirement by ID
 * Accessible by: ADMIN, REGISTRAR
 */
router.get('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const requirement = await documentRequirementRepository.findOne({
      where: { id },
      relations: ['category', 'creator', 'studentDocuments']
    });

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: 'Document requirement not found'
      });
    }

    res.json({
      success: true,
      data: requirement
    });
  } catch (error) {
    console.error('Error fetching document requirement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document requirement'
    });
  }
});

/**
 * POST /api/document-requirements
 * Create a new document requirement
 * Accessible by: ADMIN, REGISTRAR
 */
router.post('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      description,
      isRequired,
      isInitial,
      categoryId,
      validationRules,
      applicableGradeLevels,
      expirationDays
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Requirement name is required'
      });
    }

    // Dweezil's Code - Validate unique name within the same category and isInitial flag
    // This prevents duplicate requirement names that cause confusion in the UI
    const existingRequirement = await documentRequirementRepository.findOne({
      where: {
        name,
        categoryId: categoryId || null,
        isInitial: isInitial || false
      }
    });

    if (existingRequirement) {
      return res.status(400).json({
        success: false,
        message: `A requirement with the name "${name}" already exists in this category with the same initial status. Please use a unique name or update the existing requirement.`,
        existingRequirement: {
          id: existingRequirement.id,
          name: existingRequirement.name,
          categoryId: existingRequirement.categoryId,
          isInitial: existingRequirement.isInitial
        }
      });
    }

    // Validate category exists if provided
    if (categoryId) {
      const category = await documentCategoryRepository.findOne({
        where: { id: categoryId }
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID'
        });
      }
    }

    // Validate validation rules format
    if (validationRules) {
      const rules = validationRules as ValidationRules;
      if (rules.maxFileSize && (typeof rules.maxFileSize !== 'number' || rules.maxFileSize <= 0)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid max file size in validation rules'
        });
      }
      if (rules.allowedFileTypes && !Array.isArray(rules.allowedFileTypes)) {
        return res.status(400).json({
          success: false,
          message: 'Allowed file types must be an array'
        });
      }
    }

    // Create new requirement
    const requirement = documentRequirementRepository.create({
      name,
      description,
      isRequired: isRequired !== undefined ? isRequired : true,
      isInitial: isInitial || false,
      categoryId,
      validationRules,
      applicableGradeLevels,
      expirationDays,
      createdBy: req.user?.id
    });

    const savedRequirement = await documentRequirementRepository.save(requirement);

    // Fetch the complete requirement with relations
    const completeRequirement = await documentRequirementRepository.findOne({
      where: { id: savedRequirement.id },
      relations: ['category', 'creator']
    });

    res.status(201).json({
      success: true,
      data: completeRequirement,
      message: 'Document requirement created successfully'
    });
  } catch (error) {
    console.error('Error creating document requirement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create document requirement'
    });
  }
});

/**
 * PUT /api/document-requirements/:id
 * Update a document requirement
 * Accessible by: ADMIN, REGISTRAR
 */
router.put('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      isRequired,
      isInitial,
      categoryId,
      validationRules,
      applicableGradeLevels,
      expirationDays
    } = req.body;

    const requirement = await documentRequirementRepository.findOne({
      where: { id }
    });

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: 'Document requirement not found'
      });
    }

    // Dweezil's Code - Validate unique name if name is being changed
    // This prevents duplicate requirement names that cause confusion in the UI
    if (name && name !== requirement.name) {
      const newCategoryId = categoryId !== undefined ? categoryId : requirement.categoryId;
      const newIsInitial = isInitial !== undefined ? isInitial : requirement.isInitial;
      
      const existingRequirement = await documentRequirementRepository.findOne({
        where: {
          name,
          categoryId: newCategoryId || null,
          isInitial: newIsInitial
        }
      });

      if (existingRequirement && existingRequirement.id !== id) {
        return res.status(400).json({
          success: false,
          message: `A requirement with the name "${name}" already exists in this category with the same initial status. Please use a unique name.`,
          existingRequirement: {
            id: existingRequirement.id,
            name: existingRequirement.name,
            categoryId: existingRequirement.categoryId,
            isInitial: existingRequirement.isInitial
          }
        });
      }
    }

    // Validate category exists if provided
    if (categoryId && categoryId !== requirement.categoryId) {
      const category = await documentCategoryRepository.findOne({
        where: { id: categoryId }
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID'
        });
      }
    }

    // Update requirement
    if (name !== undefined) requirement.name = name;
    if (description !== undefined) requirement.description = description;
    if (isRequired !== undefined) requirement.isRequired = isRequired;
    if (isInitial !== undefined) requirement.isInitial = isInitial;
    if (categoryId !== undefined) requirement.categoryId = categoryId;
    if (validationRules !== undefined) requirement.validationRules = validationRules;
    if (applicableGradeLevels !== undefined) requirement.applicableGradeLevels = applicableGradeLevels;
    if (expirationDays !== undefined) requirement.expirationDays = expirationDays;

    const updatedRequirement = await documentRequirementRepository.save(requirement);

    // Fetch the complete requirement with relations
    const completeRequirement = await documentRequirementRepository.findOne({
      where: { id: updatedRequirement.id },
      relations: ['category', 'creator']
    });

    res.json({
      success: true,
      data: completeRequirement,
      message: 'Document requirement updated successfully'
    });
  } catch (error) {
    console.error('Error updating document requirement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document requirement'
    });
  }
});



/**
 * PATCH /api/document-requirements/:id/toggle-required
 * Toggle required status of a document requirement
 * Accessible by: ADMIN, REGISTRAR
 */
router.patch('/:id/toggle-required', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const requirement = await documentRequirementRepository.findOne({
      where: { id }
    });

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: 'Document requirement not found'
      });
    }

    requirement.isRequired = !requirement.isRequired;
    const updatedRequirement = await documentRequirementRepository.save(requirement);

    res.json({
      success: true,
      data: updatedRequirement,
      message: `Document requirement marked as ${updatedRequirement.isRequired ? 'required' : 'optional'} successfully`
    });
  } catch (error) {
    console.error('Error toggling document requirement status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle document requirement status'
    });
  }
});

/**
 * POST /api/document-requirements/seed-sample-data
 * Seed sample document requirements data
 * Accessible by: ADMIN only
 */
router.post('/seed-sample-data', authenticateToken, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🌱 Starting document requirements seeding...');

    // Import DataSeeder class
    const { DataSeeder } = await import('../utils/dataSeeder');
    const seeder = new DataSeeder();

    // Initialize database connection if not already initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Run only document requirements seeding
    await seeder.seedDocumentRequirements();

    console.log('✅ Document requirements seeding completed');

    res.json({
      success: true,
      message: 'Document requirements sample data seeded successfully'
    });
  } catch (error) {
    console.error('❌ Error seeding document requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed document requirements sample data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
