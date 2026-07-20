import { Router, Request, Response, IRouter } from 'express';
import { AppDataSource } from '../config/database';
import { Employee, EmployeeStatus } from '../entities/Employee';
import { User, UserRole } from '../entities/User';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { In, Like, FindOptionsWhere } from 'typeorm';
import bcrypt from 'bcrypt';
import { EmployeeIdService } from '../services/EmployeeIdService';

const router: IRouter = Router();
const employeeRepository = AppDataSource.getRepository(Employee);

/**
 * GET /api/employees
 * Get all employees with filtering and pagination
 * Accessible by: ADMIN, REGISTRAR
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const department = req.query.department as string;
    const skip = (page - 1) * limit;

    const baseFilter: FindOptionsWhere<Employee> = {};
    if (department) {
      baseFilter.department = department;
    }

    const baseUserFilter: FindOptionsWhere<User> = {};
    if (role) {
      baseUserFilter.role = role as UserRole;
    }

    if (Object.keys(baseUserFilter).length > 0) {
      baseFilter.user = baseUserFilter;
    }

    let where: FindOptionsWhere<Employee> | FindOptionsWhere<Employee>[] = baseFilter;
    
    if (search) {
      const searchTerm = Like(`%${search}%`);
      where = [
        { ...baseFilter, employeeId: searchTerm },
        { ...baseFilter, user: { ...baseUserFilter, firstName: searchTerm } },
        { ...baseFilter, user: { ...baseUserFilter, lastName: searchTerm } },
        { ...baseFilter, user: { ...baseUserFilter, email: searchTerm } }
      ];
    }

    const [employees, total] = await employeeRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['user'],
      where,
    });

    res.json({
      success: true,
      data: employees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees',
    });
  }
});

/**
 * GET /api/employees/role/teachers
 * Get all active employees with TEACHER or REGISTRAR role
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/role/teachers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const skip = (page - 1) * limit;

    const [teachers, total] = await employeeRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['user'],
      where: {
        status: EmployeeStatus.ACTIVE,
        user: {
          role: In([UserRole.TEACHER, UserRole.REGISTRAR]),
          isActive: true
        }
      }
    });

    res.json({
      success: true,
      data: teachers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers',
    });
  }
});

/**
 * GET /api/employees/:id
 * Get a specific employee by ID
 * Accessible by: ADMIN, REGISTRAR
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const employee = await employeeRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee',
    });
  }
});

/**
 * POST /api/employees
 * Create a new employee and associated user account
 * Accessible by: ADMIN
 */
router.post('/', authenticateToken, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const { userId, user: userData, employee: employeeData } = req.body as {
      userId?: string;
      user?: { firstName?: string; lastName?: string; email?: string; password?: string; role?: UserRole; isActive?: boolean };
      employee: { department: string; position: string; hireDate: string; salary?: number; phoneNumber?: string; address?: string };
    };

    if (!employeeData?.department || !employeeData?.position || !employeeData?.hireDate) {
      await queryRunner.rollbackTransaction();
      return res.status(400).json({
        success: false,
        message: 'Employee department, position, and hire date are required',
      });
    }

    let savedUser: User;

    if (userId) {
      const existingEmployee = await queryRunner.manager.findOne(Employee, { where: { userId } });
      if (existingEmployee) {
        await queryRunner.rollbackTransaction();
        return res.status(409).json({
          success: false,
          message: 'This user already has an employee record',
        });
      }

      const existingUser = await queryRunner.manager.findOne(User, { where: { id: userId } });
      if (!existingUser) {
        await queryRunner.rollbackTransaction();
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (existingUser.role === UserRole.STUDENT) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({
          success: false,
          message: 'Student users cannot be linked as employees',
        });
      }

      if (userData?.email && userData.email !== existingUser.email) {
        const emailConflict = await queryRunner.manager.findOne(User, { where: { email: userData.email } });
        if (emailConflict) {
          await queryRunner.rollbackTransaction();
          return res.status(409).json({
            success: false,
            message: 'User with this email already exists',
          });
        }
        existingUser.email = userData.email;
      }

      if (userData?.firstName) existingUser.firstName = userData.firstName;
      if (userData?.lastName) existingUser.lastName = userData.lastName;
      if (userData?.role) existingUser.role = userData.role;
      if (typeof userData?.isActive === 'boolean') existingUser.isActive = userData.isActive;

      existingUser.position = employeeData.position || existingUser.position;

      savedUser = await queryRunner.manager.save(existingUser);
    } else {
      if (!userData?.firstName || !userData?.lastName || !userData?.email) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({
          success: false,
          message: 'User first name, last name, and email are required',
        });
      }

      if (!userData?.password) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({
          success: false,
          message: 'Password is required for new users',
        });
      }

      const existingUser = await queryRunner.manager.findOne(User, {
        where: [{ email: userData.email }, { username: userData.email.split('@')[0] }]
      });

      if (existingUser) {
        await queryRunner.rollbackTransaction();
        return res.status(409).json({
          success: false,
          message: 'User with this email or username already exists',
        });
      }

      const user = new User();
      user.firstName = userData.firstName;
      user.lastName = userData.lastName;
      user.email = userData.email;
      user.username = userData.email.split('@')[0];
      user.role = userData.role || UserRole.TEACHER;
      user.position = employeeData.position || 'Teacher';
      user.password = await bcrypt.hash(userData.password, 10);
      user.isActive = typeof userData.isActive === 'boolean' ? userData.isActive : true;

      savedUser = await queryRunner.manager.save(user);
    }

    const employeeId = await EmployeeIdService.allocateEmployeeId({ queryRunner });

    // Create Employee
    const employee = new Employee();
    employee.employeeId = employeeId;
    employee.userId = savedUser.id;
    employee.department = employeeData.department;
    employee.position = employeeData.position;
    employee.hireDate = new Date(employeeData.hireDate);
    employee.salary = employeeData.salary;
    employee.phoneNumber = employeeData.phoneNumber;
    employee.address = employeeData.address;
    employee.status = EmployeeStatus.ACTIVE;

    const savedEmployee = await queryRunner.manager.save(employee);
    await queryRunner.commitTransaction();

    res.status(201).json({
      success: true,
      data: {
        ...savedEmployee,
        user: {
          id: savedUser.id,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          email: savedUser.email,
          role: savedUser.role,
          isActive: savedUser.isActive
        }
      },
      message: 'Employee created successfully'
    });

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Error creating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create employee',
    });
  } finally {
    await queryRunner.release();
  }
});

/**
 * PUT /api/employees/:id
 * Update an employee and associated user account
 * Accessible by: ADMIN
 */
router.put('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const { id } = req.params;
    const data = req.body;

    // Find employee with user relation
    const employee = await queryRunner.manager.findOne(Employee, {
      where: { id },
      relations: ['user']
    });

    if (!employee) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    if (data.employeeId !== undefined) {
      const requestUserRole = req.user?.role as UserRole | undefined;
      if (requestUserRole !== UserRole.SUPERADMIN) {
        await queryRunner.rollbackTransaction();
        return res.status(403).json({
          success: false,
          message: 'Only SUPERADMIN can update Employee ID',
        });
      }

      const nextEmployeeId = String(data.employeeId).trim();
      const isValidEmployeeId = /^\d{4}-E-\d{5}$/.test(nextEmployeeId);
      if (!isValidEmployeeId) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({
          success: false,
          message: 'Invalid Employee ID format. Expected YYYY-E-00001',
        });
      }

      if (nextEmployeeId !== employee.employeeId) {
        const existingEmployeeId = await queryRunner.manager.findOne(Employee, { where: { employeeId: nextEmployeeId } });
        if (existingEmployeeId && existingEmployeeId.id !== employee.id) {
          await queryRunner.rollbackTransaction();
          return res.status(409).json({
            success: false,
            message: 'Employee ID already exists',
          });
        }
        employee.employeeId = nextEmployeeId;
      }
    }

    // Update Employee fields
    if (data.department) employee.department = data.department;
    if (data.position) employee.position = data.position;
    if (data.hireDate) employee.hireDate = new Date(data.hireDate);
    if (data.salary !== undefined) employee.salary = data.salary;
    if (data.phoneNumber) employee.phoneNumber = data.phoneNumber;
    if (data.address) employee.address = data.address;
    
    if (data.isActive !== undefined) {
      employee.status = data.isActive ? EmployeeStatus.ACTIVE : EmployeeStatus.INACTIVE;
    }

    await queryRunner.manager.save(employee);

    // Update User fields
    if (data.user) {
      const user = employee.user;
      if (data.user.firstName) user.firstName = data.user.firstName;
      if (data.user.lastName) user.lastName = data.user.lastName;
      if (data.user.email) user.email = data.user.email;
      if (data.user.role) user.role = data.user.role;
      if (data.isActive !== undefined) user.isActive = data.isActive;
      
      await queryRunner.manager.save(user);
    }

    await queryRunner.commitTransaction();

    // Fetch updated data
    const updatedEmployee = await employeeRepository.findOne({
      where: { id },
      relations: ['user']
    });

    res.json({
      success: true,
      data: updatedEmployee,
      message: 'Employee updated successfully'
    });

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Error updating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update employee',
    });
  } finally {
    await queryRunner.release();
  }
});

export default router;
