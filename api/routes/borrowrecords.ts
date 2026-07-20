import { Router, Response, IRouter } from 'express';
import { AppDataSource } from '../config/database';
import { BorrowRecord, BorrowStatus } from '../entities/BorrowRecord';
import { Student } from '../entities/Student';
import { Book } from '../entities/Book';
import { UserRole } from '../entities/User';
import { authenticateToken, requireRole, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
// Removed express-validator and authorization imports - using manual validation and auth middleware
import { In, MoreThan, LessThan } from 'typeorm';



const router: IRouter = Router();
const borrowRecordRepository = AppDataSource.getRepository(BorrowRecord);
const studentRepository = AppDataSource.getRepository(Student);
const bookRepository = AppDataSource.getRepository(Book);

/**
 * @route GET /api/borrowrecords
 * @desc Get all borrow records with filtering and pagination
 * @access Private (Admin, REGISTRAR, Librarian, Teacher)
 */
router.get('/',
  authenticateToken,
  requireRole(UserRole.REGISTRAR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        page = '1',
        limit = '10',
        studentId,
        bookId,
        status,
        borrowDateFrom,
        borrowDateTo,
        dueDateFrom,
        dueDateTo
      } = req.query;

      // Manual validation
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 10, 100);
      
      if (pageNum < 1) {
        return res.status(400).json({
          success: false,
          message: 'Page must be a positive integer'
        });
      }

      if (limitNum < 1) {
        return res.status(400).json({
          success: false,
          message: 'Limit must be between 1 and 100'
        });
      }

      const offset = (pageNum - 1) * limitNum;

      const queryBuilder = borrowRecordRepository.createQueryBuilder('borrowRecord')
        .leftJoinAndSelect('borrowRecord.student', 'student')
        .leftJoinAndSelect('borrowRecord.book', 'book');

      // Apply filters
      if (studentId) {
        queryBuilder.andWhere('borrowRecord.studentId = :studentId', { studentId });
      }

      if (bookId) {
        queryBuilder.andWhere('borrowRecord.bookId = :bookId', { bookId });
      }

      if (status && Object.values(BorrowStatus).includes(status as BorrowStatus)) {
        queryBuilder.andWhere('borrowRecord.status = :status', { status });
      }

      if (borrowDateFrom && borrowDateTo) {
        queryBuilder.andWhere('borrowRecord.borrowDate BETWEEN :borrowDateFrom AND :borrowDateTo', {
          borrowDateFrom,
          borrowDateTo
        });
      } else if (borrowDateFrom) {
        queryBuilder.andWhere('borrowRecord.borrowDate >= :borrowDateFrom', { borrowDateFrom });
      } else if (borrowDateTo) {
        queryBuilder.andWhere('borrowRecord.borrowDate <= :borrowDateTo', { borrowDateTo });
      }

      if (dueDateFrom && dueDateTo) {
        queryBuilder.andWhere('borrowRecord.dueDate BETWEEN :dueDateFrom AND :dueDateTo', {
          dueDateFrom,
          dueDateTo
        });
      } else if (dueDateFrom) {
        queryBuilder.andWhere('borrowRecord.dueDate >= :dueDateFrom', { dueDateFrom });
      } else if (dueDateTo) {
        queryBuilder.andWhere('borrowRecord.dueDate <= :dueDateTo', { dueDateTo });
      }

      // Get total count
      const totalCount = await queryBuilder.getCount();

      // Get results with pagination
      const borrowRecords = await queryBuilder
        .orderBy('borrowRecord.borrowDate', 'DESC')
        .skip(offset)
        .take(limitNum)
        .getMany();

      const totalPages = Math.ceil(totalCount / limitNum);

      res.json({
        success: true,
        data: {
          borrowRecords,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalCount,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching borrow records:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/borrowrecords/student/:studentId
 * @desc Get borrow records for a specific student
 * @access Private (Admin, Librarian, Teacher, Student - own records only)
 */
router.get('/student/:studentId',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { studentId } = req.params;
      const { status } = req.query;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      // Manual validation
      if (!studentId || studentId.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }

      // Students can only view their own records
      if (userRole === UserRole.STUDENT && userId !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own borrow records.'
        });
      }

      const queryBuilder = borrowRecordRepository.createQueryBuilder('borrowRecord')
        .leftJoinAndSelect('borrowRecord.book', 'book')
        .leftJoinAndSelect('borrowRecord.student', 'student')
        .where('borrowRecord.studentId = :studentId', { studentId });

      if (status && Object.values(BorrowStatus).includes(status as BorrowStatus)) {
        queryBuilder.andWhere('borrowRecord.status = :status', { status });
      }

      const borrowRecords = await queryBuilder
        .orderBy('borrowRecord.borrowDate', 'DESC')
        .getMany();

      res.json({
        success: true,
        data: borrowRecords
      });
    } catch (error) {
      console.error('Error fetching student borrow records:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/borrowrecords/book/:bookId
 * @desc Get borrow records for a specific book
 * @access Private (Admin, REGISTRAR, Librarian, Teacher)
 */
router.get('/book/:bookId',
  authenticateToken,
  requireRole(UserRole.REGISTRAR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { bookId } = req.params;

      // Manual validation
      if (!bookId || bookId.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Book ID is required'
        });
      }

      const borrowRecords = await borrowRecordRepository.find({
        where: {
          bookId
        },
        relations: ['student', 'book'],
        order: { borrowDate: 'DESC' }
      });

      res.json({
        success: true,
        data: borrowRecords
      });
    } catch (error) {
      console.error('Error fetching book borrow records:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/borrowrecords/overdue
 * @desc Get all overdue borrow records
 * @access Private (Admin, Librarian, Teacher)
 */
router.get('/overdue',
  authenticateToken,
  requireRole(UserRole.TEACHER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentDate = new Date();

      const overdueBorrowRecords = await borrowRecordRepository.find({
        where: [
          {
            status: BorrowStatus.BORROWED,
            dueDate: LessThan(currentDate)
          },
          {
            status: BorrowStatus.OVERDUE
          }
        ],
        relations: ['student', 'book'],
        order: { dueDate: 'ASC' }
      });

      // Update status to OVERDUE for borrowed books past due date
      const borrowedOverdue = overdueBorrowRecords.filter(
        record => record.status === BorrowStatus.BORROWED && record.dueDate < currentDate
      );

      if (borrowedOverdue.length > 0) {
        await Promise.all(
          borrowedOverdue.map(async (record) => {
            record.status = BorrowStatus.OVERDUE;
            // Calculate fine (e.g., $1 per day overdue)
            const daysOverdue = Math.ceil((currentDate.getTime() - record.dueDate.getTime()) / (1000 * 60 * 60 * 24));
            record.fineAmount = daysOverdue * 1.0; // $1 per day
            return borrowRecordRepository.save(record);
          })
        );
      }

      res.json({
        success: true,
        data: overdueBorrowRecords
      });
    } catch (error) {
      console.error('Error fetching overdue records:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/borrowrecords/statistics
 * @desc Get borrowing statistics
 * @access Private (Admin, Librarian, Teacher)
 */
router.get('/statistics',
  authenticateToken,
  requireRole(UserRole.TEACHER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentDate = new Date();
      const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Total active borrow records
      const totalActive = await borrowRecordRepository.count({
        where: {
          status: In([BorrowStatus.BORROWED, BorrowStatus.OVERDUE])
        }
      });

      // Total overdue records
      const totalOverdue = await borrowRecordRepository.count({
        where: {
          status: BorrowStatus.OVERDUE
        }
      });

      // Total returned in last 30 days
      const recentReturns = await borrowRecordRepository.count({
        where: {
          status: BorrowStatus.RETURNED,
          returnDate: MoreThan(thirtyDaysAgo)
        }
      });

      // Total borrowed in last 30 days
      const recentBorrows = await borrowRecordRepository.count({
        where: {
          borrowDate: MoreThan(thirtyDaysAgo)
        }
      });

      // Total fines collected
      const fineStats = await borrowRecordRepository
        .createQueryBuilder('borrowRecord')
        .select('SUM(borrowRecord.fineAmount)', 'totalFines')
        .where('borrowRecord.fineAmount > 0')
        .getRawOne();

      // Most borrowed books (top 10)
      const popularBooks = await borrowRecordRepository
        .createQueryBuilder('borrowRecord')
        .leftJoinAndSelect('borrowRecord.book', 'book')
        .select('book.id', 'bookId')
        .addSelect('book.title', 'title')
        .addSelect('book.author', 'author')
        .addSelect('COUNT(borrowRecord.id)', 'borrowCount')
        .groupBy('book.id')
        .addGroupBy('book.title')
        .addGroupBy('book.author')
        .orderBy('borrowCount', 'DESC')
        .limit(10)
        .getRawMany();

      res.json({
        success: true,
        data: {
          summary: {
            totalActiveBorrows: totalActive,
            totalOverdue: totalOverdue,
            recentReturns,
            recentBorrows,
            totalFinesCollected: parseFloat(fineStats?.totalFines || '0')
          },
          popularBooks: popularBooks.map(book => ({
            bookId: book.bookId,
            title: book.title,
            author: book.author,
            borrowCount: parseInt(book.borrowCount)
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/borrowrecords/:id
 * @desc Get borrow record by ID
 * @access Private (Admin, Librarian, Teacher, Student - own records only)
 */
router.get('/:id',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Manual validation
      if (!id || id.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Borrow record ID is required'
        });
      }
      const userRole = req.user?.role;
      const userId = req.user?.id;

      const borrowRecord = await borrowRecordRepository.findOne({
        where: { id },
        relations: ['student', 'book']
      });

      if (!borrowRecord) {
        return res.status(404).json({
          success: false,
          message: 'Borrow record not found'
        });
      }

      // Students can only view their own records
      if (userRole === UserRole.STUDENT && userId !== borrowRecord.studentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own borrow records.'
        });
      }

      res.json({
        success: true,
        data: borrowRecord
      });
    } catch (error) {
      console.error('Error fetching borrow record:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/borrowrecords
 * @desc Create a new borrow record (checkout)
 * @access Private (Admin, Librarian)
 */
router.post('/',
  authenticateToken,
  requireRole(UserRole.LIBRARIAN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { studentId, bookId, dueDate } = req.body;

      // Manual validation
      if (!studentId || studentId.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }
      
      if (!bookId || bookId.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Book ID is required'
        });
      }

      // Validate student exists
      const student = await studentRepository.findOne({
        where: { id: studentId }
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Validate book exists and is available
      const book = await bookRepository.findOne({
        where: { id: bookId, isActive: true }
      });

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found or inactive'
        });
      }

      if (book.availableCopies <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Book is not available for borrowing'
        });
      }

      // Check if student already has this book borrowed
      const existingBorrow = await borrowRecordRepository.findOne({
        where: {
          studentId,
          bookId,
          status: BorrowStatus.BORROWED
        }
      });

      if (existingBorrow) {
        return res.status(400).json({
          success: false,
          message: 'Student already has this book borrowed'
        });
      }

      // Check student's borrowing limit (e.g., max 5 books)
      const activeBorrows = await borrowRecordRepository.count({
        where: {
          studentId,
          status: In([BorrowStatus.BORROWED, BorrowStatus.OVERDUE])
        }
      });

      const maxBorrowLimit = 5;
      if (activeBorrows >= maxBorrowLimit) {
        return res.status(400).json({
          success: false,
          message: `Student has reached the maximum borrowing limit of ${maxBorrowLimit} books`
        });
      }

      // Set due date (default to 14 days from now if not provided)
      const borrowDate = new Date();
      const finalDueDate = dueDate ? new Date(dueDate) : new Date(borrowDate.getTime() + (14 * 24 * 60 * 60 * 1000));

      // Create borrow record
      const borrowRecord = borrowRecordRepository.create({
        studentId,
        bookId,
        borrowDate,
        dueDate: finalDueDate,
        status: BorrowStatus.BORROWED,
        renewalCount: 0,
        fineAmount: 0
      });

      const savedBorrowRecord = await borrowRecordRepository.save(borrowRecord);

      // Update book availability
      book.availableCopies -= 1;
      await bookRepository.save(book);

      // Fetch the complete record with relations
      const completeBorrowRecord = await borrowRecordRepository.findOne({
        where: { id: savedBorrowRecord.id },
        relations: ['student', 'book']
      });

      res.status(201).json({
        success: true,
        message: 'Book checked out successfully',
        data: completeBorrowRecord
      });
    } catch (error) {
      console.error('Error creating borrow record:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route PUT /api/borrowrecords/:id
 * @desc Update borrow record (return/renew)
 * @access Private (Admin, Librarian)
 */
router.put('/:id',
  authenticateToken,
  requireRole(UserRole.LIBRARIAN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { action, returnDate, renewalDueDate, notes } = req.body;

      // Manual validation
      if (!id || id.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Borrow record ID is required'
        });
      }

      if (!action || !['return', 'renew'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Action must be either "return" or "renew"'
        });
      }

      const borrowRecord = await borrowRecordRepository.findOne({
        where: { id },
        relations: ['book']
      });

      if (!borrowRecord) {
        return res.status(404).json({
          success: false,
          message: 'Borrow record not found'
        });
      }

      if (action === 'return') {
        if (borrowRecord.status === BorrowStatus.RETURNED) {
          return res.status(400).json({
            success: false,
            message: 'Book has already been returned'
          });
        }

        // Update borrow record
        borrowRecord.status = BorrowStatus.RETURNED;
        borrowRecord.returnDate = returnDate ? new Date(returnDate) : new Date();
        if (notes) borrowRecord.notes = notes;

        // Calculate fine if overdue
        const currentDate = new Date();
        if (borrowRecord.dueDate < currentDate) {
          const daysOverdue = Math.ceil((currentDate.getTime() - borrowRecord.dueDate.getTime()) / (1000 * 60 * 60 * 24));
          borrowRecord.fineAmount = daysOverdue * 1.0; // $1 per day
        }

        await borrowRecordRepository.save(borrowRecord);

        // Update book availability
        const book = borrowRecord.book;
        book.availableCopies += 1;
        await bookRepository.save(book);

        res.json({
          success: true,
          message: 'Book returned successfully',
          data: borrowRecord
        });
      } else if (action === 'renew') {
        if (borrowRecord.status !== BorrowStatus.BORROWED) {
          return res.status(400).json({
            success: false,
            message: 'Only borrowed books can be renewed'
          });
        }

        // Check renewal limit (e.g., max 2 renewals)
        const maxRenewals = 2;
        if (borrowRecord.renewalCount >= maxRenewals) {
          return res.status(400).json({
            success: false,
            message: `Maximum renewal limit of ${maxRenewals} reached`
          });
        }

        // Update due date (extend by 14 days)
        const newDueDate = renewalDueDate ? new Date(renewalDueDate) : 
          new Date(borrowRecord.dueDate.getTime() + (14 * 24 * 60 * 60 * 1000));
        
        borrowRecord.dueDate = newDueDate;
        borrowRecord.renewalCount += 1;
        if (notes) borrowRecord.notes = notes;

        await borrowRecordRepository.save(borrowRecord);

        res.json({
          success: true,
          message: 'Book renewed successfully',
          data: borrowRecord
        });
      }
    } catch (error) {
      console.error('Error updating borrow record:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route DELETE /api/borrowrecords/:id
 * @desc Delete borrow record (soft delete)
 * @access Private (Admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Manual validation
      if (!id || id.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Borrow record ID is required'
        });
      }

      const borrowRecord = await borrowRecordRepository.findOne({
        where: { id },
        relations: ['book']
      });

      if (!borrowRecord) {
        return res.status(404).json({
          success: false,
          message: 'Borrow record not found'
        });
      }

      // Check if record can be deleted (only if returned or lost)
      if (![BorrowStatus.RETURNED, BorrowStatus.LOST].includes(borrowRecord.status)) {
        return res.status(400).json({
          success: false,
          message: 'Only returned or lost borrow records can be deleted'
        });
      }

      // Soft delete by adding deletion note
      borrowRecord.notes = `${borrowRecord.notes || ''} [DELETED: ${new Date().toISOString()}]`.trim();
      await borrowRecordRepository.save(borrowRecord);

      res.json({
        success: true,
        message: 'Borrow record deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting borrow record:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

export default router;