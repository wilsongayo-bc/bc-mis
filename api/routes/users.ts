import { Router, Response, IRouter, RequestHandler } from 'express';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { Student, Gender, StudentStatus } from '../entities/Student';
import { Employee } from '../entities/Employee';
import { Enrollment } from '../entities/Enrollment';
import { authenticateToken, requireAdmin, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { getManageableRoles, canManageUser } from '../utils/roleHierarchy';
import { In, Like, MoreThanOrEqual, LessThanOrEqual, Between, FindOptionsWhere, FindOperator } from 'typeorm';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { put, del } from '@vercel/blob';

// Interface for user filter conditions
interface UserFilterCondition {
  role?: UserRole | FindOperator<UserRole>;
  firstName?: string | FindOperator<string>;
  lastName?: string | FindOperator<string>;
  email?: string | FindOperator<string>;
  position?: string | FindOperator<string>;
  isActive?: boolean;
  createdAt?: Date | FindOperator<Date>;
  [key: string]: unknown; // For additional dynamic properties
}

const router: IRouter = Router();
const userRepository = AppDataSource.getRepository(User);
const studentRepository = AppDataSource.getRepository(Student);
const employeeRepository = AppDataSource.getRepository(Employee);

const getDefaultPasswordFromIdentifier = (identifier: string): string => {
  const digits = identifier.replace(/\D/g, '');
  const lastFive = digits.slice(-5).padStart(5, '0');
  return `bc-${lastFive}`;
};

router.get('/students/search', authenticateToken, requireRoles([UserRole.REGISTRAR, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
    const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, limitRaw)) : 20;
    const includeWithStudent = req.query.includeWithStudent !== 'false';

    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const query = `%${q}%`;

    const qb = userRepository
      .createQueryBuilder('user')
      .leftJoin('user.student', 'student')
      .where('user.role = :role', { role: UserRole.STUDENT })
      .andWhere('(user.firstName LIKE :query OR user.lastName LIKE :query OR user.email LIKE :query OR user.username LIKE :query)', { query });

    if (!includeWithStudent) {
      qb.andWhere('student.id IS NULL');
    }

    const users = await qb
      .select([
        'user.id',
        'user.email',
        'user.username',
        'user.firstName',
        'user.lastName',
        'user.middleInitial',
        'user.role',
        'user.isActive',
        'student.id'
      ])
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .take(limit)
      .getMany();

    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error searching student users:', error);
    return res.status(500).json({ success: false, message: 'Failed to search users' });
  }
});

router.get('/employees/search', authenticateToken, requireRoles([UserRole.REGISTRAR, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
    const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, limitRaw)) : 20;
    const includeWithEmployee = req.query.includeWithEmployee === 'true';

    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const query = `%${q}%`;

    const qb = userRepository
      .createQueryBuilder('user')
      .leftJoin('user.employee', 'employee')
      .where('user.role != :excludedRole', { excludedRole: UserRole.STUDENT })
      .andWhere('(user.firstName LIKE :query OR user.lastName LIKE :query OR user.email LIKE :query OR user.username LIKE :query)', { query });

    if (!includeWithEmployee) {
      qb.andWhere('employee.id IS NULL');
    }

    const users = await qb
      .select([
        'user.id',
        'user.email',
        'user.username',
        'user.firstName',
        'user.lastName',
        'user.middleInitial',
        'user.role',
        'user.isActive',
        'employee.id'
      ])
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .take(limit)
      .getMany();

    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error searching employee users:', error);
    return res.status(500).json({ success: false, message: 'Failed to search users' });
  }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all manageable users
 *     description: Retrieve a paginated list of users that the current user can manage, with filtering capabilities
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for user name or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [STUDENT, FACULTY, STAFF, LIBRARIAN, REGISTRAR, ADMIN, SUPERADMIN]
 *         description: Filter by user role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by user status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter users created after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter users created before this date
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
 *         description: Number of users per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                   example: "Users retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
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
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserRole = req.user?.role as UserRole;
    const manageableRoles = getManageableRoles(currentUserRole);
    
    // Extract query parameters
    const {
      search = '',
      role,
      position,
      status, // isActive filter
      activity: _activity,
      startDate,
      endDate,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Parse pagination parameters
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10))); // Max 100 items per page
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const whereConditions: UserFilterCondition[][] = [];
    
    // Base condition: only manageable roles
    const baseCondition: UserFilterCondition = { role: In(manageableRoles) };
    
    // Search filter (firstName, lastName, email)
    const searchString = typeof search === 'string' ? search.trim() : '';
    if (searchString) {
      const searchTerm = `%${searchString}%`;
      whereConditions.push([
        { ...baseCondition, firstName: Like(searchTerm) },
        { ...baseCondition, lastName: Like(searchTerm) },
        { ...baseCondition, email: Like(searchTerm) }
      ]);
    } else {
      whereConditions.push([baseCondition]);
    }

    // Apply additional filters to each condition
    const applyFilters = (condition: UserFilterCondition): UserFilterCondition => {
      const filteredCondition = { ...condition };
      
      // Role filter
      if (role && manageableRoles.includes(role as UserRole)) {
        filteredCondition.role = role as UserRole;
      }
      
      // Position filter
      if (position && typeof position === 'string') {
        filteredCondition.position = Like(`%${position}%`);
      }
      
      // Status filter (isActive)
      if (status !== undefined && status !== '') {
        filteredCondition.isActive = status === 'true';
      }
      
      // Date range filter
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          filteredCondition.createdAt = Between(start, end);
        }
      } else if (startDate) {
        const start = new Date(startDate as string);
        if (!isNaN(start.getTime())) {
          filteredCondition.createdAt = MoreThanOrEqual(start);
        }
      } else if (endDate) {
        const end = new Date(endDate as string);
        if (!isNaN(end.getTime())) {
          filteredCondition.createdAt = LessThanOrEqual(end);
        }
      }
      
      return filteredCondition;
    };

    // Apply filters to all conditions
    const finalConditions = whereConditions.flat().map(applyFilters) as FindOptionsWhere<User>[];

    // Build order clause
    const orderField = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'role'].includes(sortBy as string) 
      ? sortBy as string 
      : 'createdAt';
    const orderDirection = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const orderClause: Record<string, 'ASC' | 'DESC'> = {};
    orderClause[orderField] = orderDirection;
    
    // Add secondary sorting for consistency
    if (orderField !== 'lastName') {
      orderClause.lastName = 'ASC';
    }
    if (orderField !== 'firstName') {
      orderClause.firstName = 'ASC';
    }

    // Execute query with pagination
    const [users, total] = await userRepository.findAndCount({
      where: finalConditions,
      select: ['id', 'email', 'username', 'firstName', 'lastName', 'middleInitial', 'position', 'role', 'isActive', 'isEmailVerified', 'emailVerifiedAt', 'avatarUrl', 'createdAt', 'updatedAt'],
      order: orderClause,
      skip: offset,
      take: limitNum
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      manageable_roles: manageableRoles
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

/**
 * GET /api/users/manageable-roles
 * Get roles that the current user can manage
 */
router.get('/manageable-roles', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserRole = req.user?.role as UserRole;
    const manageableRoles = getManageableRoles(currentUserRole);

    res.json({
      success: true,
      data: manageableRoles
    });
  } catch (error) {
    console.error('Error fetching manageable roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch manageable roles'
    });
  }
});

/**
 * GET /api/users/:id
 * Get a specific user by ID (if manageable by current user)
 */
router.get('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserRole = req.user?.role as UserRole;
    
    const user = await userRepository.findOne({
      where: { id: id },
      select: ['id', 'email', 'username', 'firstName', 'lastName', 'middleInitial', 'position', 'role', 'isActive', 'isEmailVerified', 'emailVerifiedAt', 'avatarUrl', 'createdAt', 'updatedAt']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if current user can manage this user
    if (!canManageUser(currentUserRole, user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this user'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

/**
 * POST /api/users
 * Create a new user (role restrictions apply)
 */
router.post('/', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName, role, roles, username, middleInitial, position, isEmailVerified } = req.body;
    const currentUserRole = req.user?.role as UserRole;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role || !username) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, firstName, lastName, role, and username are required'
      });
    }

    // Validate password against configured requirements
    const { validatePassword } = await import('../middleware/authConfig');
    const passwordValidation = await validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Check if current user can create a user with this role
    if (!canManageUser(currentUserRole, role)) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to create users with ${role} role`
      });
    }

    const roleValues = Object.values(UserRole);
    const requestedRolesRaw = Array.isArray(roles) ? roles : undefined;
    const requestedRoles = requestedRolesRaw
      ? requestedRolesRaw.filter((r: unknown): r is UserRole => typeof r === 'string' && roleValues.includes(r as UserRole))
      : [];

    if (requestedRolesRaw && requestedRolesRaw.length > 0 && requestedRoles.length !== requestedRolesRaw.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid roles provided'
      });
    }

    const effectiveRoles = Array.from(new Set([role as UserRole, ...requestedRoles]));
    const hasRoleAssignmentPermission = effectiveRoles.every(r => canManageUser(currentUserRole, r));
    if (!hasRoleAssignmentPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to assign one or more of the selected roles'
      });
    }

    // Check if user already exists (email or username)
    const existingUser = await userRepository.findOne({ 
      where: [
        { email },
        { username }
      ]
    });
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(409).json({
        success: false,
        message: `User with this ${field} already exists`
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      username,
      middleInitial: middleInitial || null,
      position: position || '',
      role,
      roles: effectiveRoles,
      isActive: true,
      isEmailVerified: isEmailVerified === true,
      emailVerifiedAt: isEmailVerified === true ? new Date() : null
    });

    await userRepository.save(newUser);

    // If user role is STUDENT, automatically create a Student record
    if (role === UserRole.STUDENT) {
      try {
        // Generate unique student ID
        const studentCount = await studentRepository.count();
        const studentId = `STU${String(studentCount + 1).padStart(6, '0')}`;
        
        // Create student record with default values
        const newStudent = studentRepository.create({
          studentId,
          userId: newUser.id,
          dateOfBirth: new Date('2000-01-01'), // Default date
          gender: Gender.OTHER,
          address: 'Not provided',
          emergencyContact: 'Not provided',
          emergencyPhone: 'Not provided',
          gradeLevelId: undefined,
          enrollmentDate: new Date(),
          status: StudentStatus.ENROLLED
        });
        
        await studentRepository.save(newStudent);
      } catch (studentError) {
        console.error('Error creating student record:', studentError);
        // Don't fail the user creation if student creation fails
        // The sync endpoint can handle this later
      }
    }

    // Remove password from response
    const { password: _, ...userResponse } = newUser;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

/**
 * PUT /api/users/:id
 * Update a user (role restrictions apply)
 */
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role, roles, isActive, username, middleInitial, position, isEmailVerified } = req.body;
    const currentUserRole = req.user?.role as UserRole;
    
    const user = await userRepository.findOne({ where: { id: id } });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if current user can manage this user
    if (!canManageUser(currentUserRole, user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this user'
      });
    }

    // If role is being changed, check if current user can assign the new role
    if (role && role !== user.role && !canManageUser(currentUserRole, role)) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to assign ${role} role`
      });
    }

    const roleValues = Object.values(UserRole);
    const requestedRolesRaw = Array.isArray(roles) ? roles : undefined;
    const requestedRoles = requestedRolesRaw
      ? requestedRolesRaw.filter((r: unknown): r is UserRole => typeof r === 'string' && roleValues.includes(r as UserRole))
      : [];

    if (requestedRolesRaw && requestedRolesRaw.length > 0 && requestedRoles.length !== requestedRolesRaw.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid roles provided'
      });
    }

    const nextPrimaryRole = (role || user.role) as UserRole;
    if (requestedRolesRaw) {
      const effectiveRoles = Array.from(new Set([nextPrimaryRole, ...requestedRoles]));
      const hasRoleAssignmentPermission = effectiveRoles.every(r => canManageUser(currentUserRole, r));
      if (!hasRoleAssignmentPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to assign one or more of the selected roles'
        });
      }
      user.roles = effectiveRoles;
    } else if (role && role !== user.role) {
      user.roles = [nextPrimaryRole];
    }

    // Check for username conflicts if username is being updated
    if (username && username !== user.username) {
      const existingUserWithUsername = await userRepository.findOne({ where: { username } });
      if (existingUserWithUsername) {
        return res.status(409).json({
          success: false,
          message: 'User with this username already exists'
        });
      }
    }

    if (typeof email === 'string') {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      if (normalizedEmail !== user.email) {
        const existingUserWithEmail = await userRepository.findOne({ where: { email: normalizedEmail } });
        if (existingUserWithEmail && existingUserWithEmail.id !== user.id) {
          return res.status(409).json({
            success: false,
            message: 'User with this email already exists'
          });
        }

        user.email = normalizedEmail;
        user.isEmailVerified = false;
        user.emailVerifiedAt = null;
      }
    }

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (username) user.username = username;
    if (middleInitial !== undefined) user.middleInitial = middleInitial || null;
    if (position !== undefined) user.position = position || '';
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    if (typeof isEmailVerified === 'boolean') {
      if (isEmailVerified && !user.isEmailVerified) {
        user.isEmailVerified = true;
        user.emailVerifiedAt = new Date();
      } else if (!isEmailVerified && user.isEmailVerified) {
        user.isEmailVerified = false;
        user.emailVerifiedAt = null;
      }
    }

    await userRepository.save(user);

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

/**
 * PUT /api/users/:id/password
 * Update user password (admin can reset any manageable user's password)
 */
router.put('/:id/password', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body as { newPassword?: string };
    const currentUserRole = req.user?.role as UserRole;
    const currentUserId = req.user?.id;
    
    if (id === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot reset your own password'
      });
    }

    const user = await userRepository.findOne({ where: { id } });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if current user can manage this user
    if (!canManageUser(currentUserRole, user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reset this user\'s password'
      });
    }

    const resolvedPassword =
      typeof newPassword === 'string' && newPassword.trim().length > 0
        ? newPassword
        : undefined;

    const effectiveNewPassword = (() => {
      if (resolvedPassword) return resolvedPassword;
      return undefined;
    })();

    if (!effectiveNewPassword) {
      const employee = await employeeRepository.findOne({ where: { userId: id } });
      const student = await studentRepository.findOne({ where: { userId: id } });
      const identifier = employee?.employeeId || student?.studentId;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: 'No employee/student identifier found for this user to generate a default password'
        });
      }

      const defaultPassword = getDefaultPasswordFromIdentifier(identifier);

      // Hash new password
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      user.password = hashedPassword;
      user.mustChangePassword = true;
      await userRepository.save(user);

      return res.json({
        success: true,
        message: 'Password reset successfully'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(effectiveNewPassword, saltRounds);
    
    user.password = hashedPassword;
    user.mustChangePassword = true;
    await userRepository.save(user);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update password'
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user (role restrictions apply)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserRole = req.user?.role as UserRole;
    const currentUserId = req.user?.id;
    
    // Prevent self-deletion
    if (id === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await userRepository.findOne({ where: { id: id } });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if current user can manage this user
    if (!canManageUser(currentUserRole, user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this user'
      });
    }

    await userRepository.remove(user);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

/**
 * GET /api/users/roles/manageable
 * Get roles that the current user can assign to other users
 */
router.get('/roles/manageable', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserRole = req.user?.role as UserRole;
    const manageableRoles = getManageableRoles(currentUserRole);
    
    res.json({
      success: true,
      data: manageableRoles
    });
  } catch (error) {
    console.error('Error fetching manageable roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch manageable roles'
    });
  }
});

/**
 * POST /api/users/bulk-reset-password
 * Bulk reset user passwords to defaults derived from employeeId/studentId
 */
router.post('/bulk-reset-password', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userIds } = req.body as { userIds?: string[] };
    const currentUserRole = req.user?.role as UserRole;
    const currentUserId = req.user?.id;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required and cannot be empty'
      });
    }

    if (currentUserId && userIds.includes(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot bulk reset your own password'
      });
    }

    const users = await userRepository.findByIds(userIds);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found with the provided IDs'
      });
    }

    const unauthorizedUsers = users.filter(user => !canManageUser(currentUserRole, user.role));
    if (unauthorizedUsers.length > 0) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to manage users with roles: ${unauthorizedUsers.map(u => u.role).join(', ')}`
      });
    }

    const employees = await employeeRepository.find({
      where: { userId: In(userIds) },
      select: ['userId', 'employeeId']
    });
    const students = await studentRepository.find({
      where: { userId: In(userIds) },
      select: ['userId', 'studentId']
    });

    const employeeByUserId = new Map(employees.map(e => [e.userId, e.employeeId]));
    const studentByUserId = new Map(students.map(s => [s.userId, s.studentId]));

    const results: Array<{ userId: string; success: boolean; reason?: string }> = [];

    for (const user of users) {
      const identifier = employeeByUserId.get(user.id) || studentByUserId.get(user.id);
      if (!identifier) {
        results.push({ userId: user.id, success: false, reason: 'Missing employee/student identifier' });
        continue;
      }

      const defaultPassword = getDefaultPasswordFromIdentifier(identifier);
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      user.password = hashedPassword;
      user.mustChangePassword = true;
      results.push({ userId: user.id, success: true });
    }

    await userRepository.save(users);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return res.json({
      success: true,
      message: `Password reset completed: ${successCount} succeeded, ${failureCount} failed`,
      data: {
        successCount,
        failureCount,
        results
      }
    });
  } catch (error) {
    console.error('Error bulk resetting passwords:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk reset passwords'
    });
  }
});

/**
 * POST /api/users/bulk-status
 * Bulk activate/deactivate users
 */
router.post('/bulk-status', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userIds, isActive } = req.body;
    const currentUserRole = req.user?.role as UserRole;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required and cannot be empty'
      });
    }
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    // Fetch all users to be updated
    const users = await userRepository.findByIds(userIds);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found with the provided IDs'
      });
    }

    // Check permissions for each user
    const unauthorizedUsers = users.filter(user => !canManageUser(currentUserRole, user.role));
    if (unauthorizedUsers.length > 0) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to manage users with roles: ${unauthorizedUsers.map(u => u.role).join(', ')}`
      });
    }

    // Update user status
    await userRepository.update(
      { id: In(userIds) },
      { isActive }
    );

    res.json({
      success: true,
      message: `Successfully ${isActive ? 'activated' : 'deactivated'} ${users.length} user(s)`,
      updatedCount: users.length
    });
  } catch (error) {
    console.error('Error bulk updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update user status'
    });
  }
});

/**
 * PUT /api/users/bulk/roles
 * Bulk update user roles
 */
router.put('/bulk/roles', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userIds, role } = req.body;
    const currentUserRole = req.user?.role as UserRole;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required and cannot be empty'
      });
    }
    
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'role is required'
      });
    }

    // Check if current user can assign the new role
    if (!canManageUser(currentUserRole, role)) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to assign ${role} role`
      });
    }

    // Fetch all users to be updated
    const users = await userRepository.findByIds(userIds);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found with the provided IDs'
      });
    }

    // Check permissions for each user's current role
    const unauthorizedUsers = users.filter(user => !canManageUser(currentUserRole, user.role));
    if (unauthorizedUsers.length > 0) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to manage users with roles: ${unauthorizedUsers.map(u => u.role).join(', ')}`
      });
    }

    // Update user roles
    await userRepository.update(
      { id: In(userIds) },
      { role, roles: [role] }
    );

    res.json({
      success: true,
      message: `Successfully updated ${users.length} user(s) to ${role} role`
    });
  } catch (error) {
    console.error('Error bulk updating user roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update user roles'
    });
  }
});

/**
 * POST /api/users/bulk-delete
 * Bulk delete users
 */
router.post('/bulk-delete', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userIds } = req.body;
    const currentUserRole = req.user?.role as UserRole;
    const currentUserId = req.user?.id;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required and cannot be empty'
      });
    }

    // Prevent self-deletion
    if (userIds.includes(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Fetch all users to be deleted
    const users = await userRepository.findByIds(userIds);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found with the provided IDs'
      });
    }

    // Check permissions for each user
    const unauthorizedUsers = users.filter(user => !canManageUser(currentUserRole, user.role));
    if (unauthorizedUsers.length > 0) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to delete users with roles: ${unauthorizedUsers.map(u => u.role).join(', ')}`
      });
    }

    // Delete users
    await userRepository.remove(users);

    res.json({
      success: true,
      message: `Successfully deleted ${users.length} user(s)`,
      deletedCount: users.length
    });
  } catch (error) {
    console.error('Error bulk deleting users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete users'
    });
  }
});



/**
 * GET /api/users/:id/profile
 * Get detailed user profile information
 */
router.get('/:id/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserRole = req.user?.role as UserRole;
    const currentUserId = req.user?.id;

    console.log('🔍 User Profile API - Request details:', {
      requestedId: id,
      currentUserId,
      currentUserRole,
      timestamp: new Date().toISOString()
    });

    // Initialize repositories within the route to ensure proper connection
    const userRepo = AppDataSource.getRepository(User);
    const studentRepo = AppDataSource.getRepository(Student);
    const employeeRepo = AppDataSource.getRepository(Employee);

    let user;

    // Support both new (YYYY-E-XXXXX) and old (YYYY-00-XXXXX) formats
    const isEmployeeIdFormat = /^(\d{4}-E-\d{5}|\d{4}-00-\d{5})$/.test(id);
    // Support various student ID formats including new YYYY-XXXXX, old YYYY-CC-XXXXX, etc.
    const isStudentIdFormat = /^(\d{4}-\d{5}|\d{4}-\d{2}-\d{5}|\d{2}-\d{2}-(\d{3}|\d{5})|[A-Z]{3}\d{3}-\d{4}-\d{4}-\d{4})$/.test(id);

    console.log('🔍 ID Format Analysis:', {
      id,
      isEmployeeIdFormat,
      isStudentIdFormat,
      idLength: id.length
    });

    if (isEmployeeIdFormat) {
      const employee = await employeeRepo.findOne({
        where: { employeeId: id },
        relations: ['user', 'user.student'],
        select: {
          id: true,
          employeeId: true,
          user: {
            id: true,
            email: true,
            isEmailVerified: true,
            emailVerifiedAt: true,
            firstName: true,
            lastName: true,
            middleInitial: true,
            username: true,
            position: true,
            role: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
            avatarUrl: true
          }
        }
      });

      if (employee?.user) {
        user = {
          ...employee.user,
          employee: employee,
          student: employee.user.student || null
        };
      }
    }

    if (!user && isStudentIdFormat) {
      // Look up user by studentId
      const student = await studentRepo.findOne({
        where: { studentId: id },
        relations: ['user', 'user.employee'],
        select: {
          id: true,
          studentId: true,
          user: {
            id: true,
            email: true,
            isEmailVerified: true,
            emailVerifiedAt: true,
            firstName: true,
            lastName: true,
            middleInitial: true,
            username: true,
            position: true,
            role: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
            avatarUrl: true
          }
        }
      });

      if (student?.user) {
        // Reconstruct user object with student relation
        user = {
          ...student.user,
          student: student,
          employee: student.user.employee || null
        };
        console.log('✅ Found user by studentId:', {
          userId: user.id,
          studentId: student.studentId,
          userRole: user.role
        });
      } else {
        console.log('❌ No student found with studentId:', id);
      }
    }

    if (!user) {
      // Find the user with related entities using UUID
      user = await userRepo.findOne({
        where: { id },
        relations: ['student', 'employee'],
        select: {
          id: true,
          email: true,
          isEmailVerified: true,
          emailVerifiedAt: true,
          firstName: true,
          lastName: true,
          middleInitial: true,
          username: true,
          position: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          avatarUrl: true
        }
      });

      if (user) {
         console.log('✅ Found user by UUID:', {
           userId: user.id,
           userRole: user.role
         });
       } else {
         console.log('❌ No user found with UUID:', id);
       }
     }

    if (!user) {
      console.log('❌ User lookup failed - returning 404');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions - users can view their own profile or admins can view others
    const canViewProfile = 
      currentUserId === user.id || // Own profile (use actual user ID, not parameter)
      currentUserRole === UserRole.SUPERADMIN || // Superadmin can view all
      (currentUserRole === UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) || // Admin can view non-superadmin
      (currentUserRole === UserRole.TEACHER && 
       [UserRole.TEACHER, UserRole.STUDENT].includes(user.role)); // Teacher can view teachers/students

    if (!canViewProfile) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this user profile'
      });
    }

    // Build profile response
    const profileData = {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      firstName: user.firstName,
      lastName: user.lastName,
      middleInitial: user.middleInitial,
      username: user.username,
      fullName: `${user.firstName} ${user.middleInitial ? user.middleInitial + ' ' : ''}${user.lastName}`.trim(),
      role: user.role,
      position: user.position,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      avatarUrl: user.avatarUrl,
      student: user.student ? await (async () => {
        // Dweezil's Code - Load enrollments with course and subjects for enrolled students
        const enrollmentRepo = AppDataSource.getRepository(Enrollment);
        const enrollments = await enrollmentRepo.find({
          where: { studentId: user.student.id },
          relations: ['course', 'courseSection'],
          order: { enrollmentDate: 'DESC' }
        });

        return {
          id: user.student.id,
          studentId: user.student.studentId,
          enrollmentDate: user.student.enrollmentDate,
          graduationDate: user.student.graduationDate,
          status: user.student.status,
          registrationStatus: user.student.registrationStatus,
          enrollments: enrollments.map(enrollment => ({
            id: enrollment.id,
            status: enrollment.status,
            enrollmentDate: enrollment.enrollmentDate,
            selectedSubjects: enrollment.selectedSubjects,
            course: enrollment.course ? {
              id: enrollment.course.id,
              courseCode: enrollment.course.courseCode,
              name: enrollment.course.name
            } : null,
            courseSection: enrollment.courseSection ? {
              id: enrollment.courseSection.id,
              sectionName: enrollment.courseSection.sectionName,
              yearLevel: enrollment.courseSection.yearLevel
            } : null
          }))
        };
      })() : null,
      employee: user.employee ? {
        id: user.employee.id,
        employeeId: user.employee.employeeId,
        hireDate: user.employee.hireDate,
        salary: user.employee.salary,
        status: user.employee.status
      } : null
    };

    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ USER PROFILE ERROR:', {
      message: errorMessage,
      requestedId: req.params.id,
      currentUserId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    if (errorStack) {
      console.error('Error stack:', errorStack);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

/**
 * POST /api/users/bulk-import
 * Bulk import users from CSV/JSON data
 */
router.post('/bulk-import', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { users } = req.body;
    const currentUserRole = req.user?.role as UserRole;
    
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'users array is required and cannot be empty'
      });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const saltRounds = 10;

    for (const userData of users) {
      try {
        const { email, firstName, lastName, role } = userData;
        
        // Validate required fields
        if (!email || !firstName || !lastName || !role) {
          errors.push(`Missing required fields for user: ${email || 'unknown email'}`);
          failedCount++;
          continue;
        }

        // Check if current user can create a user with this role
        if (!canManageUser(currentUserRole, role)) {
          errors.push(`No permission to create user with ${role} role: ${email}`);
          failedCount++;
          continue;
        }

        // Check if user already exists
        const existingUser = await userRepository.findOne({ where: { email } });
        if (existingUser) {
          errors.push(`User already exists: ${email}`);
          failedCount++;
          continue;
        }

        // Generate a default password (should be changed on first login)
        const defaultPassword = 'TempPass123!';
        const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

        // Create new user
        const newUser = userRepository.create({
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role,
          isActive: true
        });

        await userRepository.save(newUser);
        successCount++;
      } catch (error) {
        errors.push(`Failed to create user ${userData.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedCount++;
      }
    }

    res.json({
      success: true,
      message: `Import completed: ${successCount} successful, ${failedCount} failed`,
      data: {
        success: successCount,
        failed: failedCount,
        errors
      }
    });
  } catch (error) {
    console.error('Error bulk importing users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk import users'
    });
  }
});

// Configure multer for avatar uploads
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and SVG files are allowed.'));
    }
  },
});

/**
 * POST /api/users/:id/avatar
 * Upload user avatar
 */
router.post('/:id/avatar', authenticateToken, avatarUpload.single('avatar') as unknown as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserRole = req.user?.role as UserRole;
    const currentUserId = req.user?.id;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar file provided'
      });
    }

    // Check Vercel Blob token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return res.status(500).json({
        success: false,
        message: 'File storage not configured'
      });
    }

    // Find the user
    const user = await userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'avatarUrl']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions - users can upload their own avatar or admins can manage any user's avatar
    const canUploadAvatar = 
      currentUserId === id || // Own avatar
      currentUserRole === UserRole.SUPERADMIN || // Superadmin can manage all
      (currentUserRole === UserRole.ADMIN && user.role !== UserRole.SUPERADMIN); // Admin can manage non-superadmin

    if (!canUploadAvatar) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to upload avatar for this user'
      });
    }

    // Delete old avatar if exists
    if (user.avatarUrl) {
      try {
        await del(user.avatarUrl);
        console.log(`Deleted old avatar: ${user.avatarUrl}`);
      } catch (error) {
        console.warn('Failed to delete old avatar:', error);
        // Continue with upload even if old avatar deletion fails
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
    const filename = `avatars/user-${id}-${timestamp}.${fileExtension}`;

    // Upload to Vercel Blob
    const blob = await put(filename, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
    });

    // Update user's avatarUrl in database
    await userRepository.update(id, { avatarUrl: blob.url });

    console.log(`Avatar uploaded for user ${id}: ${blob.url}`);

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatarUrl: blob.url
      }
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      }
    }

    // Handle file type errors
    if (error instanceof Error && error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar'
    });
  }
});

/**
 * DELETE /api/users/:id/avatar
 * Delete user avatar
 */
router.delete('/:id/avatar', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserRole = req.user?.role as UserRole;
    const currentUserId = req.user?.id;

    // Check Vercel Blob token
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORAGE_TOKEN || process.env.VERCEL_BLOB_RW_TOKEN;
    if (!blobToken) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return res.status(500).json({
        success: false,
        message: 'File storage not configured'
      });
    }

    // Find the user
    const user = await userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'avatarUrl']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions - users can delete their own avatar or admins can manage any user's avatar
    const canDeleteAvatar = 
      currentUserId === id || // Own avatar
      currentUserRole === UserRole.SUPERADMIN || // Superadmin can manage all
      (currentUserRole === UserRole.ADMIN && user.role !== UserRole.SUPERADMIN); // Admin can manage non-superadmin

    if (!canDeleteAvatar) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete avatar for this user'
      });
    }

    // Check if user has an avatar
    if (!user.avatarUrl) {
      return res.status(404).json({
        success: false,
        message: 'User does not have an avatar'
      });
    }

    // Delete from Vercel Blob
    try {
      await del(user.avatarUrl, { token: blobToken });
      console.log(`Deleted avatar: ${user.avatarUrl}`);
    } catch (error) {
      console.warn('Failed to delete avatar from storage:', error);
      // Continue with database update even if blob deletion fails
    }

    // Remove avatarUrl from database
    await userRepository.update(id, { avatarUrl: null });

    console.log(`Avatar deleted for user ${id}`);

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete avatar'
    });
  }
});

/**
 * PATCH /api/users/profile
 * Update current user's own profile
 */
router.patch('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { firstName, lastName, middleInitial, email } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    // Get current user
    const user = await userRepository.findOne({ where: { id: currentUserId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user fields
    user.firstName = firstName.trim();
    user.lastName = lastName.trim();
    user.middleInitial = middleInitial ? middleInitial.trim() : null;

    if (typeof email === 'string') {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      if (normalizedEmail !== user.email) {
        const existingEmailUser = await userRepository.findOne({ where: { email: normalizedEmail } });
        if (existingEmailUser && existingEmailUser.id !== user.id) {
          return res.status(400).json({
            success: false,
            message: 'Email is already in use'
          });
        }

        user.email = normalizedEmail;
        user.isEmailVerified = false;
        user.emailVerifiedAt = null;
      }
    }

    await userRepository.save(user);

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

export default router;
