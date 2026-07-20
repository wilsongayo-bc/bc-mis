/**
 * This is a user authentication API route.
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response, type IRouter } from 'express';
import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { AppDataSource, initializeDatabase } from '../config/database';
import { User, UserRole } from '../entities/User';
import { Student } from '../entities/Student';
import { Employee } from '../entities/Employee';
import { validatePassword, getPasswordRequirements, getAuthConfig } from '../middleware/authConfig';

const router: IRouter = Router();

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Generate default password from identifier (employeeId or studentId)
 * Format: bc-{last5digits}
 */
const getDefaultPasswordFromIdentifier = (identifier: string): string => {
  const digits = identifier.replace(/\D/g, '');
  const lastFive = digits.slice(-5).padStart(5, '0');
  return `bc-${lastFive}`;
};


/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Create a new user account with email, password, and basic information
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             email: "newuser@benedictcollege.edu"
 *             password: "password123"
 *             firstName: "John"
 *             lastName: "Doe"
 *             role: "STUDENT"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "User with this email already exists"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *     security: []
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role = UserRole.STUDENT } = req.body;
    const normalizedFirstName = typeof firstName === 'string' ? firstName.trim().toUpperCase() : '';
    const normalizedLastName = typeof lastName === 'string' ? lastName.trim().toUpperCase() : '';

    // Validate required fields
    if (!email || !password || !normalizedFirstName || !normalizedLastName) {
      res.status(400).json({
        success: false,
        message: 'Email, password, first name, and last name are required'
      });
      return;
    }

    // Validate password against configured requirements
    const passwordValidation = await validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
      return;
    }

    // Initialize database connection
    await initializeDatabase();
    
    // Get user repository
    const userRepository = AppDataSource.getRepository(User);

    // Check if user already exists
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate username from email (before @ symbol) or fallback to firstName + lastName
    const emailUsername = email.split('@')[0];
    const fallbackUsername = `${normalizedFirstName.toLowerCase()}${normalizedLastName.toLowerCase()}`;
    const baseUsername = emailUsername.length >= 3 ? emailUsername : fallbackUsername;
    
    // Ensure username is unique by checking existing users
    let username = baseUsername;
    let counter = 1;
    while (await userRepository.findOne({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // Set default position based on role
    const position = role === UserRole.STUDENT ? 'Student' : 
                    role === UserRole.TEACHER ? 'Teacher' :
                    role === UserRole.ADMIN ? 'Administrator' :
                    role === UserRole.REGISTRAR ? 'Registrar' :
                    role === UserRole.LIBRARIAN ? 'Librarian' :
                    'Staff';

    // Create new user
    const user = userRepository.create({
      email,
      password: hashedPassword,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      username,
      position,
      role,
      roles: [role],
      isActive: true
    });

    const savedUser = await userRepository.save(user);

    // Get auth config for dynamic token expiration
    const authConfig = await getAuthConfig();
    const tokenExpiration = `${authConfig.sessionTimeout}m`; // Convert minutes to JWT format

    // Generate JWT token
    const token = jwt.sign(
      {
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
        roles: Array.isArray(savedUser.roles) && savedUser.roles.length > 0 ? savedUser.roles : [savedUser.role],
        position: savedUser.position
      },
      JWT_SECRET,
      { expiresIn: tokenExpiration } as SignOptions
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          role: savedUser.role,
          roles: Array.isArray(savedUser.roles) && savedUser.roles.length > 0 ? savedUser.roles : [savedUser.role],
          position: savedUser.position,
          status: savedUser.isActive ? 'ACTIVE' : 'INACTIVE',
          profilePicture: savedUser.avatarUrl,
          phoneNumber: '',
          address: '',
          dateOfBirth: '',
          createdAt: savedUser.createdAt.toISOString(),
          updatedAt: savedUser.updatedAt.toISOString()
        }
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Registration error:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User login
 *     description: Authenticate user with email/username and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login
 *               - password
 *             properties:
 *               login:
 *                 type: string
 *                 description: Email address or username
 *                 example: "user@benedictcollege.edu"
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Invalid credentials"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *     security: []
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { login, password, loginType } = req.body as {
      login?: string;
      password?: string;
      loginType?: 'AUTO' | 'EMAIL_OR_USERNAME' | 'STUDENT_ID' | 'EMPLOYEE_ID';
    };

    const normalizedLogin = typeof login === 'string' ? login.trim() : '';
    const normalizedPassword = typeof password === 'string' ? password : '';

    // Validate required fields
    if (!normalizedLogin || !normalizedPassword) {
      res.status(400).json({
        success: false,
        message: 'Username/email and password are required'
      });
      return;
    }
    
    // Initialize database connection
    await initializeDatabase();
    
    // Get user repository
    const userRepository = AppDataSource.getRepository(User);
    const studentRepository = AppDataSource.getRepository(Student);
    const employeeRepository = AppDataSource.getRepository(Employee);

    let user: User | null = null;

    if (loginType === 'STUDENT_ID') {
      const student = await studentRepository.findOne({
        where: { studentId: normalizedLogin },
        relations: ['user']
      });
      user = student?.user ?? null;
    } else if (loginType === 'EMPLOYEE_ID') {
      const employee = await employeeRepository.findOne({
        where: { employeeId: normalizedLogin },
        relations: ['user']
      });
      user = employee?.user ?? null;
    } else if (loginType === 'EMAIL_OR_USERNAME') {
      const isEmail = normalizedLogin.includes('@');
      if (isEmail) {
        user = await userRepository.findOne({ where: { email: normalizedLogin } });
      } else if (normalizedLogin === 'admin') {
        user = await userRepository.findOne({
          where: [
            { username: 'admin' },
            { email: 'admin@benedictcollege.edu' },
            { email: 'admin@benedictcollege.com' }
          ]
        });
      } else {
        user = await userRepository.findOne({ where: { username: normalizedLogin } });
      }
    } else {
      const isEmail = normalizedLogin.includes('@');
      if (isEmail) {
        user = await userRepository.findOne({ where: { email: normalizedLogin } });
      } else if (normalizedLogin === 'admin') {
        user = await userRepository.findOne({
          where: [
            { username: 'admin' },
            { email: 'admin@benedictcollege.edu' },
            { email: 'admin@benedictcollege.com' }
          ]
        });
      } else {
        user = await userRepository.findOne({ where: { username: normalizedLogin } });
        if (!user) {
          const student = await studentRepository.findOne({
            where: { studentId: normalizedLogin },
            relations: ['user']
          });
          user = student?.user ?? null;
        }
        if (!user) {
          const employee = await employeeRepository.findOne({
            where: { employeeId: normalizedLogin },
            relations: ['user']
          });
          user = employee?.user ?? null;
        }
      }
    }
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid username/email or password'
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
      return;
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(normalizedPassword, user.password);
    
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid username/email or password'
      });
      return;
    }
    
    // Update last login and check for default password
    const now = new Date();
    
    // If user is logging in with the default password format (bc-xxxxx),
    // force them to change it even if not explicitly flagged by an admin.
    if (!user.mustChangePassword) {
      const employee = await employeeRepository.findOne({ where: { userId: user.id } });
      const student = await studentRepository.findOne({ where: { userId: user.id } });
      const identifierForDefault = employee?.employeeId || student?.studentId || normalizedLogin;
      
      const expectedDefaultPassword = getDefaultPasswordFromIdentifier(identifierForDefault);
      if (normalizedPassword === expectedDefaultPassword) {
        user.mustChangePassword = true;
        console.log(`[AUTH] User ${user.email} logged in with default password. Flagging mustChangePassword = true.`);
      }
    }

    user.lastLogin = now;
    await userRepository.save(user);

    // Check if 2FA is enabled globally (system-wide)
    const authConfig = await getAuthConfig();
    
    if (authConfig.twoFactorEnabled) {
      // 2FA is enabled system-wide, require verification for all users
      res.status(200).json({
        success: true,
        message: 'Two-factor authentication required',
        requiresTwoFactor: true,
        data: {
          userId: user.id,
          email: user.email
        }
      });
      return;
    }

    // Get auth config for dynamic token expiration
    const tokenExpiration = `${authConfig.sessionTimeout}m`; // Convert minutes to JWT format

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role],
        position: user.position
      },
      JWT_SECRET,
      { expiresIn: tokenExpiration } as SignOptions
    );
    
    const response = {
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role],
          position: user.position,
          status: user.isActive ? 'ACTIVE' : 'INACTIVE',
          mustChangePassword: user.mustChangePassword,
          profilePicture: user.avatarUrl,
          phoneNumber: '',
          address: '',
          dateOfBirth: '',
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString()
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ LOGIN ERROR:', errorMessage);
    if (errorStack) {
      console.error('Error stack:', errorStack);
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

/**
 * User Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    // For JWT-based authentication, logout is typically handled client-side
    // by removing the token from storage. Server-side logout would require
    // token blacklisting which is more complex.
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Logout error:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user profile
 *     description: Retrieve the profile information of the currently authenticated user
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *                   example: "Profile retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *     security:
 *       - bearerAuth: []
 */
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      console.log('🔐 Profile endpoint - Token validation started');
      console.log('🔑 JWT_SECRET exists:', !!JWT_SECRET);
      console.log('🎫 Token length:', token.length);
      console.log('🎫 Token preview:', token.substring(0, 20) + '...');
      
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string; roles?: string[]; position?: string };
      console.log('✅ Token decoded successfully:', { id: decoded.id, email: decoded.email, role: decoded.role });
      
      // Initialize database connection
      await initializeDatabase();
      
      const userRepository = AppDataSource.getRepository(User);
      
      const user = await userRepository.findOne({ where: { id: decoded.id } });
      console.log('👤 User lookup result:', { found: !!user, isActive: user?.isActive });
      
      if (!user || !user.isActive) {
        console.log('❌ User not found or inactive');
        res.status(401).json({
          success: false,
          message: 'User not found or inactive'
        });
        return;
      }

      console.log('✅ Profile endpoint successful for user:', user.email);
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role],
            position: user.position,
            status: user.isActive ? 'ACTIVE' : 'INACTIVE',
            mustChangePassword: user.mustChangePassword,
            profilePicture: user.avatarUrl,
            phoneNumber: '',
            address: '',
            dateOfBirth: '',
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString()
          }
        }
      });
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', {
        error: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error',
        tokenPreview: token.substring(0, 20) + '...',
        jwtSecretExists: !!JWT_SECRET,
        timestamp: new Date().toISOString()
      });
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Profile error:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Update user password
 * PUT /api/auth/password
 */
router.put('/password', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
      
      // Initialize database connection
      await initializeDatabase();
      const userRepository = AppDataSource.getRepository(User);
      
      // Get user from database
      const user = await userRepository.findOne({ where: { id: decoded.id } });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      // Validate required fields
      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
        return;
      }

      // Validate new password against configured requirements
      const passwordValidation = await validatePassword(newPassword);
      if (!passwordValidation.valid) {
        res.status(400).json({
          success: false,
          message: passwordValidation.message
        });
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
        return;
      }

      // Check if new password is different from current password
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        res.status(400).json({
          success: false,
          message: 'New password must be different from current password'
        });
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      await userRepository.update(decoded.id, {
        password: newPasswordHash,
        mustChangePassword: false
      });

      res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });

    } catch (jwtError) {
      console.log('❌ JWT verification failed in password update:', {
        error: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error',
        timestamp: new Date().toISOString()
      });
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Password update error:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password update'
    });
  }
});

/**
 * Get password requirements
 * GET /api/auth/password-requirements
 */
router.get('/password-requirements', async (req: Request, res: Response): Promise<void> => {
  try {
    const requirements = await getPasswordRequirements();
    res.status(200).json({
      success: true,
      data: requirements
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching password requirements:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch password requirements'
    });
  }
});

export default router;
