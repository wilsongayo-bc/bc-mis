import { Router, Request, Response, IRouter } from 'express';
import { AppDataSource } from '../config/database';
import { Payment, PaymentType, PaymentStatus, PaymentMethod } from '../entities/Payment';
import { Student } from '../entities/Student';
import { Enrollment } from '../entities/Enrollment';
import { authenticateToken, requireRole, requireRoles } from '../middleware/auth';
import { UserRole } from '../entities/User';
import { Between, MoreThanOrEqual, LessThanOrEqual, In, FindOptionsWhere } from 'typeorm';

interface PaymentFilterCondition {
  studentId?: string;
  enrollmentId?: string;
  type?: PaymentType | ReturnType<typeof In>;
  status?: PaymentStatus | ReturnType<typeof In>;
  paymentMethod?: PaymentMethod | ReturnType<typeof In>;
  amount?: ReturnType<typeof Between> | ReturnType<typeof MoreThanOrEqual> | ReturnType<typeof LessThanOrEqual> | number;
  dueDate?: ReturnType<typeof Between> | ReturnType<typeof MoreThanOrEqual> | ReturnType<typeof LessThanOrEqual> | Date;
  paidDate?: ReturnType<typeof Between> | ReturnType<typeof MoreThanOrEqual> | ReturnType<typeof LessThanOrEqual> | Date;
  createdAt?: ReturnType<typeof Between> | ReturnType<typeof MoreThanOrEqual> | ReturnType<typeof LessThanOrEqual> | Date;
  updatedAt?: ReturnType<typeof Between> | ReturnType<typeof MoreThanOrEqual> | ReturnType<typeof LessThanOrEqual> | Date;
}

const router: IRouter = Router();
const paymentRepository = AppDataSource.getRepository(Payment);
const studentRepository = AppDataSource.getRepository(Student);
const enrollmentRepository = AppDataSource.getRepository(Enrollment);

/**
 * Generate unique payment transaction ID
 */
function generateTransactionId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAY-${timestamp}-${random}`;
}

async function recomputeEnrollmentTotals(enrollmentId: string): Promise<void> {
  const enrollment = await enrollmentRepository.findOne({ where: { id: enrollmentId } });
  if (!enrollment) {
    return;
  }

  const payments = await paymentRepository.find({
    where: {
      enrollmentId,
      status: PaymentStatus.PAID
    }
  });

  const totalPaid = payments.reduce((sum, payment) => {
    return sum + parseFloat(payment.amount.toString());
  }, 0);

  enrollment.totalPaid = totalPaid;
  const totalAssessed = parseFloat(enrollment.totalAssessed.toString());
  enrollment.balance = Math.max(0, totalAssessed - totalPaid);

  await enrollmentRepository.save(enrollment);
}

/**
 * GET /api/payments/reports/daily-collection
 * Get daily collection report
 * Accessible by: ADMIN, FINANCE
 */
router.get('/reports/daily-collection', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.FINANCE]), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to today if no date range provided
    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const payments = await paymentRepository.find({
      where: {
        paidDate: Between(start, end),
        status: PaymentStatus.PAID
      },
      relations: ['student', 'student.user', 'enrollment', 'enrollment.course'],
      order: { paidDate: 'DESC' }
    });

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Group by payment method
    const byMethod = payments.reduce((acc, p) => {
      const method = p.paymentMethod || 'UNKNOWN';
      if (!acc[method]) acc[method] = 0;
      acc[method] += Number(p.amount);
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        payments,
        summary: {
          totalAmount,
          count: payments.length,
          byMethod
        },
        dateRange: {
          start,
          end
        }
      }
    });
  } catch (error) {
    console.error('Error generating daily collection report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

/**
 * GET /api/payments/reports/by-method
 * Get payment summary by method (Cash, Card, Check, etc)
 * Accessible by: ADMIN, FINANCE
 */
router.get('/reports/by-method', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.FINANCE]), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const payments = await paymentRepository.find({
      where: {
        paidDate: Between(start, end),
        status: PaymentStatus.PAID
      }
    });

    // Group by method and include bank details from remarks if available
    const breakdown = payments.reduce((acc, p) => {
      const method = p.paymentMethod || 'UNKNOWN';
      const amount = Number(p.amount);
      
      if (!acc[method]) {
        acc[method] = {
          total: 0,
          count: 0,
          details: {} as Record<string, number>
        };
      }
      
      acc[method].total += amount;
      acc[method].count += 1;

      // Extract bank/card info from remarks if present
      // Format: "Paid via VISA | Bank: BPI" or just "Bank: BPI"
      if (p.remarks && (method === PaymentMethod.BANK_TRANSFER || method === PaymentMethod.CHECK || method === PaymentMethod.CREDIT_CARD)) {
        let detailKey = 'Other';
        
        if (method === PaymentMethod.CREDIT_CARD) {
          if (p.remarks.includes('VISA')) detailKey = 'VISA';
          else if (p.remarks.includes('MASTERCARD')) detailKey = 'MASTERCARD';
        } else {
          // Extract Bank Name
          const bankMatch = p.remarks.match(/Bank:\s*([^|]+)/);
          if (bankMatch && bankMatch[1]) {
            detailKey = bankMatch[1].trim();
          }
        }

        if (!acc[method].details[detailKey]) acc[method].details[detailKey] = 0;
        acc[method].details[detailKey] += amount;
      }

      return acc;
    }, {} as Record<string, { total: number, count: number, details: Record<string, number> }>);

    res.json({
      success: true,
      data: {
        breakdown,
        dateRange: {
          start,
          end
        }
      }
    });
  } catch (error) {
    console.error('Error generating payment method report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

/**
 * Calculate late fee based on days overdue
 */
function calculateLateFee(amount: number, daysOverdue: number): number {
  if (daysOverdue <= 0) return 0;
  
  // 2% late fee for first 30 days, then 1% per additional 30 days
  const baseFee = amount * 0.02;
  const additionalFee = Math.floor(daysOverdue / 30) * (amount * 0.01);
  return Math.min(baseFee + additionalFee, amount * 0.1); // Cap at 10% of original amount
}

/**
 * Generate payment receipt data
 */
interface PaymentReceipt {
  receiptId: string;
  paymentId: string;
  transactionId: string | null;
  studentId: string;
  amount: number;
  type: PaymentType;
  paymentMethod: PaymentMethod | null;
  paidDate: Date | null;
  description: string | null;
  generatedAt: string;
}

function generateReceipt(payment: Payment): PaymentReceipt {
  return {
    receiptId: `RCP-${payment.id.substring(0, 8).toUpperCase()}`,
    paymentId: payment.id,
    transactionId: payment.transactionId,
    studentId: payment.studentId,
    amount: payment.amount,
    type: payment.type,
    paymentMethod: payment.paymentMethod,
    paidDate: payment.paidDate,
    description: payment.description,
    generatedAt: new Date().toISOString()
  };
}

router.get('/', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FINANCE]), async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      studentId,
      enrollmentId,
      type,
      status,
      paymentMethod,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const offset = (pageNumber - 1) * limitNumber;

    // Build where conditions
    const whereConditions: PaymentFilterCondition = {};
    
    if (studentId) {
      whereConditions.studentId = studentId as string;
    }

    if (enrollmentId) {
      whereConditions.enrollmentId = enrollmentId as string;
    }
    
    if (type) {
      whereConditions.type = type as PaymentType;
    }
    
    if (status) {
      whereConditions.status = status as PaymentStatus;
    }
    
    if (paymentMethod) {
      whereConditions.paymentMethod = paymentMethod as PaymentMethod;
    }

    // Date range filtering
    if (startDate && endDate) {
      whereConditions.createdAt = Between(new Date(startDate as string), new Date(endDate as string));
    } else if (startDate) {
      whereConditions.createdAt = MoreThanOrEqual(new Date(startDate as string));
    } else if (endDate) {
      whereConditions.createdAt = LessThanOrEqual(new Date(endDate as string));
    }

    // Amount range filtering
    if (minAmount && maxAmount) {
      whereConditions.amount = Between(parseFloat(minAmount as string), parseFloat(maxAmount as string));
    } else if (minAmount) {
      whereConditions.amount = MoreThanOrEqual(parseFloat(minAmount as string));
    } else if (maxAmount) {
      whereConditions.amount = LessThanOrEqual(parseFloat(maxAmount as string));
    }

    // Build query
    let queryBuilder = paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .where(whereConditions);

    // Add sorting
    const validSortFields = ['createdAt', 'updatedAt', 'amount', 'dueDate', 'paidDate', 'type', 'status'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    
    queryBuilder = queryBuilder.orderBy(`payment.${sortField}`, order);

    // Get total count for pagination
    const totalCount = await queryBuilder.getCount();

    // Apply pagination
    const payments = await queryBuilder
      .skip(offset)
      .take(limitNumber)
      .getMany();

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    res.json({
      success: true,
      data: payments,
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
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

router.get('/summary', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FINANCE]), async (req: Request, res: Response) => {
  try {
    const { studentId, enrollmentId } = req.query;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'studentId is required'
      });
    }

    const student = await studentRepository.findOne({ where: { id: studentId as string } });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    let enrollment: Enrollment | null = null;

    if (enrollmentId) {
      enrollment = await enrollmentRepository.findOne({
        where: { id: enrollmentId as string, studentId: student.id }
      });

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found for this student'
        });
      }
    }

    const paymentWhere: FindOptionsWhere<Payment> = {
      studentId: student.id
    };

    if (enrollmentId) {
      paymentWhere.enrollmentId = enrollmentId as string;
    }

    const payments = await paymentRepository.find({
      where: paymentWhere
    });

    const totals = payments.reduce(
      (acc, payment) => {
        const amount = parseFloat(payment.amount.toString());
        if (payment.status === PaymentStatus.PAID) {
          acc.paid += amount;
        } else if (payment.status === PaymentStatus.PENDING) {
          acc.pending += amount;
        } else if (payment.status === PaymentStatus.OVERDUE) {
          acc.overdue += amount;
        } else if (payment.status === PaymentStatus.REFUNDED) {
          acc.refunded += amount;
        }
        return acc;
      },
      { paid: 0, pending: 0, overdue: 0, refunded: 0 }
    );

    let eligibility = null;

    if (enrollment) {
      const requiredDownpayment = parseFloat(enrollment.downpaymentRequired.toString());
      const paidForEnrollment = payments
        .filter(p => p.status === PaymentStatus.PAID)
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

      const isEligible = paidForEnrollment >= requiredDownpayment;

      eligibility = {
        isEligibleForConfirmation: isEligible,
        requiredDownpayment,
        paidForEnrollment
      };
    }

    return res.json({
      success: true,
      data: {
        studentId: student.id,
        enrollmentId: enrollment ? enrollment.id : null,
        totals,
        eligibility
      }
    });
  } catch (error) {
    console.error('Error generating payment summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate payment summary'
    });
  }
});

/**
 * GET /api/payments/my-payments
 * Get payments for the current logged-in student
 * Accessible by: STUDENT
 */
router.get('/my-payments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const student = await studentRepository.findOne({ where: { userId } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    const payments = await paymentRepository.find({
      where: { studentId: student.id },
      order: { createdAt: 'DESC' },
      relations: ['enrollment', 'enrollment.course']
    });

    const totals = payments.reduce(
      (acc, payment) => {
        const amount = parseFloat(payment.amount.toString());
        if (payment.status === PaymentStatus.PAID) {
          acc.paid += amount;
        } else if (payment.status === PaymentStatus.PENDING) {
          acc.pending += amount;
        } else if (payment.status === PaymentStatus.OVERDUE) {
          acc.overdue += amount;
        } else if (payment.status === PaymentStatus.REFUNDED) {
          acc.refunded += amount;
        }
        return acc;
      },
      { paid: 0, pending: 0, overdue: 0, refunded: 0 }
    );

    res.json({
      success: true,
      data: payments,
      summary: totals
    });
  } catch (error) {
    console.error('Error fetching student payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

/**
 * GET /api/payments/reports
 * Get financial summary and reports
 * Accessible by: ADMIN, FINANCE
 * Dweezil's Code - Moved before /:id route to prevent route conflict
 */
router.get('/reports', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.FINANCE]), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, _groupBy = 'month' } = req.query;

    const dateFilter: PaymentFilterCondition = {};
    if (startDate && endDate) {
      dateFilter.createdAt = Between(new Date(startDate as string), new Date(endDate as string));
    }

    // Get all payments for the period
    const payments = await paymentRepository.find({
      where: dateFilter as FindOptionsWhere<Payment>,
      relations: ['student', 'student.user']
    });

    // Calculate summary statistics
    const totalRevenue = payments
      .filter(p => p.status === PaymentStatus.PAID)
      .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);

    const pendingRevenue = payments
      .filter(p => p.status === PaymentStatus.PENDING)
      .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);

    const overdueRevenue = payments
      .filter(p => p.status === PaymentStatus.OVERDUE)
      .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);

    // Group by payment type
    const revenueByType = Object.values(PaymentType).map(type => {
      const typePayments = payments.filter(p => p.type === type && p.status === PaymentStatus.PAID);
      const amount = typePayments.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
      return {
        type,
        amount,
        count: typePayments.length
      };
    });

    // Group by payment method
    const revenueByMethod = Object.values(PaymentMethod).map(method => {
      const methodPayments = payments.filter(p => p.paymentMethod === method && p.status === PaymentStatus.PAID);
      const amount = methodPayments.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
      return {
        method,
        amount,
        count: methodPayments.length
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalPayments: payments.length,
          totalRevenue,
          pendingRevenue,
          overdueRevenue,
          collectionRate: totalRevenue / (totalRevenue + pendingRevenue + overdueRevenue) * 100
        },
        revenueByType,
        revenueByMethod,
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'All time'
        }
      }
    });
  } catch (error) {
    console.error('Error generating payment reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment reports'
    });
  }
});

router.get('/:id', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FINANCE]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await paymentRepository.findOne({
      where: { id },
      relations: ['student', 'student.user']
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment'
    });
  }
});

router.get('/student/:studentId', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FINANCE]), async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { status, type } = req.query;

    // Verify student exists
    const student = await studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const whereConditions: PaymentFilterCondition = { studentId };
    
    if (status) {
      whereConditions.status = status as PaymentStatus;
    }
    
    if (type) {
      whereConditions.type = type as PaymentType;
    }

    const payments = await paymentRepository.find({
      where: whereConditions as FindOptionsWhere<Payment>,
      relations: ['student', 'student.user'],
      order: {
        createdAt: 'DESC'
      }
    });

    // Calculate summary statistics
    const totalAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
    const paidAmount = payments
      .filter(p => p.status === PaymentStatus.PAID)
      .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
    const pendingAmount = payments
      .filter(p => p.status === PaymentStatus.PENDING)
      .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
    const overdueAmount = payments
      .filter(p => p.status === PaymentStatus.OVERDUE)
      .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);

    res.json({
      success: true,
      data: payments,
      summary: {
        totalPayments: payments.length,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        outstandingBalance: pendingAmount + overdueAmount
      }
    });
  } catch (error) {
    console.error('Error fetching student payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student payments'
    });
  }
});

/**
 * GET /api/payments/pending
 * Get all pending and overdue payments
 * Accessible by: ADMIN, REGISTRAR, FINANCE
 */
router.get('/pending', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FINANCE]), async (req: Request, res: Response) => {
  try {
    const { type, daysOverdue } = req.query;

    const whereConditions: PaymentFilterCondition = {
      status: In([PaymentStatus.PENDING, PaymentStatus.OVERDUE])
    };
    
    if (type) {
      whereConditions.type = type as PaymentType;
    }

    let queryBuilder = paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .where(whereConditions);

    // Filter by days overdue if specified
    if (daysOverdue) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOverdue as string));
      queryBuilder = queryBuilder.andWhere('payment.dueDate <= :cutoffDate', { cutoffDate });
    }

    const payments = await queryBuilder
      .orderBy('payment.dueDate', 'ASC')
      .getMany();

    // Calculate total outstanding amount
    const totalOutstanding = payments.reduce((sum, payment) => {
      const amount = parseFloat(payment.amount.toString());
      const daysOverdue = Math.max(0, Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
      const lateFee = calculateLateFee(amount, daysOverdue);
      return sum + amount + lateFee;
    }, 0);

    res.json({
      success: true,
      data: payments,
      summary: {
        totalPendingPayments: payments.length,
        totalOutstandingAmount: totalOutstanding
      }
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending payments'
    });
  }
});

router.post('/', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FINANCE]), async (req: Request, res: Response) => {
  try {
    const {
      studentId,
      amount,
      type,
      dueDate,
      paymentMethod,
      description,
      status = PaymentStatus.PENDING,
      semester,
      year,
      remarks
    } = req.body;

    // Validate required fields
    if (!studentId || !amount || !type || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, amount, type, dueDate'
      });
    }

    // Validate amount
    const paymentAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    // Validate enums
    if (!Object.values(PaymentType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment type. Must be TUITION, REGISTRATION, LIBRARY, LABORATORY, or MISCELLANEOUS'
      });
    }

    if (status && !Object.values(PaymentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status. Must be PENDING, PAID, OVERDUE, or CANCELLED'
      });
    }

    if (paymentMethod && !Object.values(PaymentMethod).includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Must be CASH, BANK_TRANSFER, CREDIT_CARD, or CHECK'
      });
    }

    const student = await studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const transactionId = generateTransactionId();

    const paymentYear = year !== undefined && year !== null ? parseInt(year, 10) : null;

    const newPayment = paymentRepository.create({
      studentId,
      amount: paymentAmount,
      type,
      status,
      dueDate: new Date(dueDate),
      paidDate: status === PaymentStatus.PAID ? new Date() : null,
      paymentMethod: status === PaymentStatus.PAID ? paymentMethod : null,
      transactionId,
      description,
      semester: semester || null,
      year: paymentYear,
      remarks: remarks || null
    });

    const { enrollmentId } = req.body as { enrollmentId?: string };

    if (enrollmentId) {
      const enrollment = await enrollmentRepository.findOne({
        where: { id: enrollmentId, studentId: student.id }
      });

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found for this student'
        });
      }

      newPayment.enrollmentId = enrollmentId;
    }

    const savedPayment = await paymentRepository.save(newPayment);

    const completePayment = await paymentRepository.findOne({
      where: { id: savedPayment.id },
      relations: ['student', 'student.user']
    });

    let receipt = null;
    if (status === PaymentStatus.PAID) {
      receipt = generateReceipt(completePayment!);
      if (savedPayment.enrollmentId) {
        await recomputeEnrollmentTotals(savedPayment.enrollmentId);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: completePayment,
      receipt
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment'
    });
  }
});

router.put('/:id', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FINANCE]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      amount,
      type,
      status,
      dueDate,
      paidDate,
      paymentMethod,
      description,
      semester,
      year,
      remarks
    } = req.body;

    const payment = await paymentRepository.findOne({ where: { id } });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Validate amount if provided
    if (amount !== undefined) {
      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }
      payment.amount = paymentAmount;
    }

    // Validate enums if provided
    if (type && !Object.values(PaymentType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment type. Must be TUITION, REGISTRATION, LIBRARY, LABORATORY, or MISCELLANEOUS'
      });
    }

    if (status && !Object.values(PaymentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status. Must be PENDING, PAID, OVERDUE, or CANCELLED'
      });
    }

    if (paymentMethod && !Object.values(PaymentMethod).includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Must be CASH, BANK_TRANSFER, CREDIT_CARD, or CHECK'
      });
    }

    if (type) payment.type = type;
    if (status) {
      payment.status = status;
      if (status === PaymentStatus.PAID && !payment.paidDate) {
        payment.paidDate = new Date();
      }
      if (status !== PaymentStatus.PAID && payment.paidDate) {
        payment.paidDate = null;
      }
    }
    if (dueDate) payment.dueDate = new Date(dueDate);
    if (paidDate !== undefined) payment.paidDate = paidDate ? new Date(paidDate) : null;
    if (paymentMethod !== undefined) payment.paymentMethod = paymentMethod;
    if (description !== undefined) payment.description = description;
    if (remarks !== undefined) payment.remarks = remarks || null;
    if (semester !== undefined) payment.semester = semester || null;
    if (year !== undefined) {
      payment.year = year !== null ? parseInt(year, 10) : null;
    }

    if (status === PaymentStatus.PAID && !payment.transactionId) {
      payment.transactionId = generateTransactionId();
    }

    const updatedPayment = await paymentRepository.save(payment);

    if (updatedPayment.enrollmentId) {
      await recomputeEnrollmentTotals(updatedPayment.enrollmentId);
    }

    const completePayment = await paymentRepository.findOne({
      where: { id: updatedPayment.id },
      relations: ['student', 'student.user']
    });

    let receipt = null;
    if (status === PaymentStatus.PAID) {
      receipt = generateReceipt(completePayment!);
    }

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: completePayment,
      receipt
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment'
    });
  }
});

/**
 * DELETE /api/payments/:id
 * Delete a payment (soft delete by setting status to CANCELLED)
 * Accessible by: ADMIN, FINANCE
 */
router.delete('/:id', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.FINANCE]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;
    const { remarks } = req.body as { remarks?: string };

    const payment = await paymentRepository.findOne({ where: { id } });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Prevent deletion of paid payments unless permanent
    if (payment.status === PaymentStatus.PAID && permanent !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete paid payments. Use permanent=true to force deletion.'
      });
    }

    const enrollmentId = payment.enrollmentId || null;

    if (permanent === 'true') {
      await paymentRepository.remove(payment);
    } else {
      payment.status = PaymentStatus.CANCELLED;
      if (remarks !== undefined) {
        payment.remarks = remarks || null;
      }
      await paymentRepository.save(payment);
    }

    if (enrollmentId) {
      await recomputeEnrollmentTotals(enrollmentId);
    }

    if (permanent === 'true') {
      return res.json({
        success: true,
        message: 'Payment permanently deleted'
      });
    }

    return res.json({
      success: true,
      message: 'Payment cancelled successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment'
    });
  }
});

/**
 * PATCH /api/payments/:id/status
 * Update payment status
 * Accessible by: ADMIN, REGISTRAR, FINANCE
 */
router.patch('/:id/status', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FINANCE]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, paymentMethod, remarks } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    if (!Object.values(PaymentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be PENDING, PAID, OVERDUE, CANCELLED, or REFUNDED'
      });
    }

    if (status === PaymentStatus.PAID && paymentMethod && !Object.values(PaymentMethod).includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Must be CASH, BANK_TRANSFER, CREDIT_CARD, or CHECK'
      });
    }

    const payment = await paymentRepository.findOne({ where: { id } });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const previousStatus = payment.status;
    payment.status = status;
    
    if (status === PaymentStatus.PAID) {
      payment.paidDate = new Date();
      payment.paymentMethod = paymentMethod || payment.paymentMethod;
      if (!payment.transactionId) {
        payment.transactionId = generateTransactionId();
      }
    } else if (status !== PaymentStatus.PAID) {
      if (previousStatus === PaymentStatus.PAID) {
        payment.paidDate = null;
        payment.paymentMethod = null;
      }
    }

    if (remarks !== undefined) {
      payment.remarks = remarks || null;
    }

    const updatedPayment = await paymentRepository.save(payment);

    if (updatedPayment.enrollmentId) {
      await recomputeEnrollmentTotals(updatedPayment.enrollmentId);
    }

    const completePayment = await paymentRepository.findOne({
      where: { id: updatedPayment.id },
      relations: ['student', 'student.user']
    });

    // Generate receipt if payment is completed
    let receipt = null;
    if (status === PaymentStatus.PAID) {
      receipt = generateReceipt(completePayment!);
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: completePayment,
      receipt
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status'
    });
  }
});

/**
 * POST /api/payments/:id/receipt
 * Generate receipt for a paid payment
 * Accessible by: ADMIN, REGISTRAR, FINANCE
 */
router.post('/:id/receipt', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR, UserRole.FINANCE]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await paymentRepository.findOne({
      where: { id },
      relations: ['student', 'student.user']
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== PaymentStatus.PAID) {
      return res.status(400).json({
        success: false,
        message: 'Receipt can only be generated for paid payments'
      });
    }

    const receipt = generateReceipt(payment);

    res.json({
      success: true,
      message: 'Receipt generated successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt'
    });
  }
});

export default router;
