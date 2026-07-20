// Dweezil's Code - Fixed MySQL compatibility: Changed ILike to Like for case-insensitive search
import { Router, Request, Response, IRouter } from 'express';
import { AppDataSource } from '../config/database';
import { Book } from '../entities/Book';
import { UserRole } from '../entities/User';
import { authenticateToken, requireRole, requireAdmin } from '../middleware/auth';
import { Like, MoreThan, FindOptionsWhere } from 'typeorm';

// Interface for book filter conditions
interface BookFilterCondition {
  isActive?: boolean;
  title?: ReturnType<typeof Like>;
  author?: ReturnType<typeof Like>;
  isbn?: ReturnType<typeof Like>;
  category?: ReturnType<typeof Like>;
  publisher?: ReturnType<typeof Like>;
  location?: ReturnType<typeof Like>;
  availableCopies?: ReturnType<typeof Like> | ReturnType<typeof MoreThan>;
  [key: string]: unknown; // For additional dynamic properties
}

const router: IRouter = Router();
const bookRepository = AppDataSource.getRepository(Book);

/**
 * @swagger
 * /api/books:
 *   get:
 *     tags:
 *       - Books
 *     summary: Get all books
 *     description: Retrieve a paginated list of books with filtering capabilities
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Number of books per page (max 100)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for book title, author, or ISBN
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by book category
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Filter by author name
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filter by availability (books with available copies > 0)
 *     responses:
 *       200:
 *         description: Books retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Books retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     books:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Book'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Manual validation
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    
    if (page < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive integer'
      });
    }
    
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100'
      });
    }

    const skip = (page - 1) * limit;
    const where: BookFilterCondition = {};

    // Apply status filter
    if (req.query.status) {
      const status = req.query.status as string;
      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }
      // If status is 'all', don't add isActive filter
    } else {
      // Default to active books if no status filter is provided
      where.isActive = true;
    }

    // Dweezil's Code - Fixed MySQL compatibility: Changed ILike to Like for case-insensitive search
    // Apply filters
    if (req.query.title) {
      where.title = Like(`%${req.query.title}%`);
    }
    if (req.query.author) {
      where.author = Like(`%${req.query.author}%`);
    }
    if (req.query.isbn) {
      where.isbn = Like(`%${req.query.isbn}%`);
    }
    if (req.query.category) {
      where.category = Like(`%${req.query.category}%`);
    }
    if (req.query.publisher) {
      where.publisher = Like(`%${req.query.publisher}%`);
    }
    if (req.query.location) {
      where.location = Like(`%${req.query.location}%`);
    }
    if (req.query.available === 'true') {
      where.availableCopies = Like('%');
    }

    // Dweezil's Code - Fixed MySQL compatibility: Changed ILike to Like for case-insensitive search
    // Global search
    if (req.query.search) {
      const searchTerm = req.query.search as string;
      delete where.title;
      delete where.author;
      delete where.isbn;
      delete where.category;
      delete where.publisher;
      
      const [books, total] = await bookRepository.findAndCount({
        where: [
          { ...where, title: Like(`%${searchTerm}%`) },
          { ...where, author: Like(`%${searchTerm}%`) },
          { ...where, isbn: Like(`%${searchTerm}%`) },
          { ...where, category: Like(`%${searchTerm}%`) },
          { ...where, publisher: Like(`%${searchTerm}%`) }
        ] as FindOptionsWhere<Book>[],
        skip,
        take: limit,
        order: { createdAt: 'DESC' }
      });

      return res.json({
        success: true,
        data: books,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }

    const [books, total] = await bookRepository.findAndCount({
      where: where as FindOptionsWhere<Book>,
      skip,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    res.json({
      success: true,
      data: books,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/books/available
 * @desc Get all available books
 * @access Private
 */
router.get('/available', authenticateToken, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const skip = (page - 1) * limit;

    const [books, total] = await bookRepository.findAndCount({
      where: {
        isActive: true,
        availableCopies: MoreThan(0)
      },
      skip,
      take: limit,
      order: { title: 'ASC' }
    });

    res.json({
      success: true,
      data: books,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching available books:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/books/category/:category
 * @desc Get books by category
 * @access Private
 */
router.get('/category/:category', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    if (!category || category.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const skip = (page - 1) * limit;

    // Dweezil's Code - Fixed MySQL compatibility: Changed ILike to Like for case-insensitive search
    const [books, total] = await bookRepository.findAndCount({
      where: {
        category: Like(`%${category}%`),
        isActive: true
      },
      skip,
      take: limit,
      order: { title: 'ASC' }
    });

    res.json({
      success: true,
      data: books,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching books by category:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/books/search
 * @desc Advanced search for books
 * @access Private
 */
router.get('/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { q: query, fields } = req.query;
    
    if (!query || (query as string).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const skip = (page - 1) * limit;

    const searchTerm = query as string;
    const searchFields = fields ? (fields as string).split(',') : ['title', 'author', 'isbn', 'category', 'publisher', 'location'];

    const whereConditions: BookFilterCondition[] = [];
    const baseWhere = { isActive: true };

    // Dweezil's Code - Fixed MySQL compatibility: Changed ILike to Like for case-insensitive search
    searchFields.forEach(field => {
      if (['title', 'author', 'isbn', 'category', 'publisher', 'location'].includes(field)) {
        whereConditions.push({
          ...baseWhere,
          [field]: Like(`%${searchTerm}%`)
        });
      }
    });

    if (whereConditions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid search fields specified'
      });
    }

    const [books, total] = await bookRepository.findAndCount({
      where: whereConditions as FindOptionsWhere<Book>[],
      skip,
      take: limit,
      order: { title: 'ASC' }
    });

    res.json({
      success: true,
      data: books,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      searchQuery: searchTerm,
      searchFields
    });
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/books/:id
 * @desc Get book by ID
 * @access Private
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID format'
      });
    }

    const book = await bookRepository.findOne({
      where: { id },
      relations: {
        borrowRecords: {
          student: true
        }
      }
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      data: book
    });
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/books
 * @desc Create a new book
 * @access Private (Admin, Librarian)
 */
router.post('/',
  authenticateToken,
  requireRole(UserRole.LIBRARIAN),
  async (req: Request, res: Response) => {
    try {
      const {
        isbn,
        title,
        author,
        publisher,
        publishedYear,
        category,
        totalCopies = 1,
        availableCopies,
        location,
        description,
        language = 'English',
        pages,
        edition,
        externalLink
      } = req.body;

      // Manual validation
      if (!isbn || isbn.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'ISBN is required'
        });
      }
      
      if (isbn.length < 10 || isbn.length > 20) {
        return res.status(400).json({
          success: false,
          message: 'ISBN must be between 10 and 20 characters'
        });
      }
      
      if (!title || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }
      
      if (title.length > 300) {
        return res.status(400).json({
          success: false,
          message: 'Title must not exceed 300 characters'
        });
      }
      
      if (!author || author.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Author is required'
        });
      }
      
      if (author.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Author must not exceed 200 characters'
        });
      }
      
      if (!category || category.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Category is required'
        });
      }
      
      if (category.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Category must not exceed 100 characters'
        });
      }
      
      if (totalCopies < 1) {
        return res.status(400).json({
          success: false,
          message: 'Total copies must be at least 1'
        });
      }
      
      if (availableCopies !== undefined && availableCopies < 0) {
        return res.status(400).json({
          success: false,
          message: 'Available copies must be non-negative'
        });
      }
      
      if (externalLink && externalLink.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'External link must not exceed 500 characters'
        });
      }

      // Check if book with same ISBN already exists
      const existingBook = await bookRepository.findOne({
        where: { isbn }
      });

      if (existingBook) {
        return res.status(409).json({
          success: false,
          message: 'Book with this ISBN already exists'
        });
      }

      // Set available copies to total copies if not provided
      const finalAvailableCopies = availableCopies !== undefined ? availableCopies : totalCopies;

      // Validate that available copies doesn't exceed total copies
      if (finalAvailableCopies > totalCopies) {
        return res.status(400).json({
          success: false,
          message: 'Available copies cannot exceed total copies'
        });
      }

      const book = bookRepository.create({
        isbn,
        title,
        author,
        publisher,
        publishedYear,
        category,
        totalCopies,
        availableCopies: finalAvailableCopies,
        location,
        description,
        language,
        pages,
        edition,
        externalLink,
        isActive: true
      });

      const savedBook = await bookRepository.save(book);

      res.status(201).json({
        success: true,
        message: 'Book created successfully',
        data: savedBook
      });
    } catch (error) {
      console.error('Error creating book:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route PATCH /api/books/:id
 * @desc Partially update book by ID
 * @access Private (Admin, Librarian)
 */
router.patch('/:id',
  authenticateToken,
  requireRole(UserRole.LIBRARIAN),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Basic UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid book ID format'
        });
      }

      const book = await bookRepository.findOne({
        where: { id }
      });

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found'
        });
      }

      // Check if ISBN is being updated and if it conflicts with another book
      if (updateData.isbn && updateData.isbn !== book.isbn) {
        const existingBook = await bookRepository.findOne({
          where: { isbn: updateData.isbn }
        });

        if (existingBook) {
          return res.status(409).json({
            success: false,
            message: 'Book with this ISBN already exists'
          });
        }
      }

      // Validate available copies vs total copies
      const newTotalCopies = updateData.totalCopies || book.totalCopies;
      const newAvailableCopies = updateData.availableCopies !== undefined ? updateData.availableCopies : book.availableCopies;

      if (newAvailableCopies > newTotalCopies) {
        return res.status(400).json({
          success: false,
          message: 'Available copies cannot exceed total copies'
        });
      }

      // Validate external link length if provided
      if (updateData.externalLink && updateData.externalLink.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'External link must not exceed 500 characters'
        });
      }

      // Update book with only provided fields
      Object.assign(book, updateData);
      const updatedBook = await bookRepository.save(book);

      res.json({
        success: true,
        message: 'Book updated successfully',
        data: updatedBook
      });
    } catch (error) {
      console.error('Error updating book:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route PUT /api/books/:id
 * @desc Update book by ID
 * @access Private (Admin, Librarian)
 */
router.put('/:id',
  authenticateToken,
  requireRole(UserRole.LIBRARIAN),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Basic UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid book ID format'
        });
      }

      const book = await bookRepository.findOne({
        where: { id }
      });

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found'
        });
      }

      // Check if ISBN is being updated and if it conflicts with another book
      if (updateData.isbn && updateData.isbn !== book.isbn) {
        const existingBook = await bookRepository.findOne({
          where: { isbn: updateData.isbn }
        });

        if (existingBook) {
          return res.status(409).json({
            success: false,
            message: 'Book with this ISBN already exists'
          });
        }
      }

      // Validate available copies vs total copies
      const newTotalCopies = updateData.totalCopies || book.totalCopies;
      const newAvailableCopies = updateData.availableCopies !== undefined ? updateData.availableCopies : book.availableCopies;

      if (newAvailableCopies > newTotalCopies) {
        return res.status(400).json({
          success: false,
          message: 'Available copies cannot exceed total copies'
        });
      }

      // Validate external link length if provided
      if (updateData.externalLink && updateData.externalLink.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'External link must not exceed 500 characters'
        });
      }

      // Update book
      Object.assign(book, updateData);
      const updatedBook = await bookRepository.save(book);

      res.json({
        success: true,
        message: 'Book updated successfully',
        data: updatedBook
      });
    } catch (error) {
      console.error('Error updating book:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route DELETE /api/books/:id
 * @desc Delete book by ID (soft delete)
 * @access Private (Admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Basic UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid book ID format'
        });
      }

      const book = await bookRepository.findOne({
        where: { id },
        relations: ['borrowRecords']
      });

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found'
        });
      }

      // Check if book has active borrow records
      const activeBorrowRecords = book.borrowRecords?.filter(
        record => record.status === 'BORROWED' || record.status === 'OVERDUE'
      ) || [];

      if (activeBorrowRecords.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete book with active borrow records'
        });
      }

      // Soft delete
      book.isActive = false;
      await bookRepository.save(book);

      res.json({
        success: true,
        message: 'Book deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting book:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/books/bulk-import
 * @desc Bulk import books from extracted metadata
 * @access Private (Admin, Librarian)
 */
router.post('/bulk-import',
  authenticateToken,
  requireRole(UserRole.LIBRARIAN),
  async (req: Request, res: Response) => {
    try {
      const { books, skipExisting = true } = req.body;

      if (!Array.isArray(books) || books.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Books array is required and must not be empty'
        });
      }

      if (books.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Cannot import more than 100 books at once'
        });
      }

      const results = {
        created: 0,
        skipped: 0,
        errors: 0,
        details: [] as Array<{
          title: string;
          status: 'created' | 'skipped' | 'error';
          message?: string;
        }>
      };

      for (const bookData of books) {
        try {
          // Validate required fields
          if (!bookData.isbn || !bookData.title || !bookData.author || !bookData.category) {
            results.errors++;
            results.details.push({
              title: bookData.title || 'Unknown',
              status: 'error',
              message: 'Missing required fields (isbn, title, author, category)'
            });
            continue;
          }

          // Check if book already exists
          if (skipExisting) {
            const existing = await bookRepository.findOne({
              where: [
                { isbn: bookData.isbn },
                { title: bookData.title, author: bookData.author }
              ]
            });

            if (existing) {
              results.skipped++;
              results.details.push({
                title: bookData.title,
                status: 'skipped',
                message: 'Book already exists'
              });
              continue;
            }
          }

          // Create new book
          const book = bookRepository.create({
            isbn: bookData.isbn,
            title: bookData.title.substring(0, 300), // Ensure length limits
            author: bookData.author.substring(0, 200),
            publisher: bookData.publisher?.substring(0, 200),
            publishedYear: bookData.publishedYear,
            category: bookData.category.substring(0, 100),
            totalCopies: bookData.totalCopies || 1,
            availableCopies: bookData.availableCopies || bookData.totalCopies || 1,
            location: bookData.location?.substring(0, 100) || 'Digital Library',
            description: bookData.description,
            language: bookData.language || 'English',
            pages: bookData.pages,
            edition: bookData.edition?.substring(0, 50),
            isActive: true
          });

          await bookRepository.save(book);
          results.created++;
          results.details.push({
            title: bookData.title,
            status: 'created'
          });

        } catch (error) {
          results.errors++;
          results.details.push({
            title: bookData.title || 'Unknown',
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.status(201).json({
        success: true,
        message: `Bulk import completed: ${results.created} created, ${results.skipped} skipped, ${results.errors} errors`,
        data: results
      });

    } catch (error) {
      console.error('Error in bulk import:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during bulk import'
      });
    }
  }
);

export default router;