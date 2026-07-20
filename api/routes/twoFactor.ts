import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppDataSource, initializeDatabase } from '../config/database';
import { User } from '../entities/User';
import { authenticateToken } from '../middleware/auth';
import { 
  generateVerificationCode,
  storeVerificationCode,
  verifyCode,
  sendEmailCode
} from '../services/twoFactorService';
import { getAuthConfig } from '../middleware/authConfig';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Setup 2FA for a user
 * POST /api/2fa/setup
 */
router.post('/setup', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email address is required for 2FA verification'
      });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };

    await initializeDatabase();
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.id } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if 2FA is enabled globally
    const authConfig = await getAuthConfig();
    if (!authConfig.twoFactorEnabled) {
      res.status(403).json({
        success: false,
        message: 'Two-factor authentication is not enabled for this system'
      });
      return;
    }

    // Update user's 2FA settings
    user.twoFactorEmail = email;
    user.twoFactorEnabled = true;
    await userRepository.save(user);

    res.json({
      success: true,
      message: '2FA setup completed successfully',
      data: {
        email: `${email.substring(0, 3)}***@${email.split('@')[1]}`
      }
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup two-factor authentication'
    });
  }
});

/**
 * Send verification code
 * POST /api/2fa/send-code
 */
router.post('/send-code', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    await initializeDatabase();
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if 2FA is enabled globally
    const authConfig = await getAuthConfig();
    if (!authConfig.twoFactorEnabled) {
      res.status(400).json({
        success: false,
        message: 'Two-factor authentication is not enabled for this system'
      });
      return;
    }

    // Generate and store verification code
    const code = generateVerificationCode();
    storeVerificationCode(userId, code);

    // Send code to user's registered email
    const userName = `${user.firstName} ${user.lastName}`;
    await sendEmailCode(user.email, code, userName);

    res.json({
      success: true,
      message: 'Verification code sent via email',
      data: {
        expiresIn: 300 // 5 minutes in seconds
      }
    });
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send verification code'
    });
  }
});

/**
 * Verify 2FA code
 * POST /api/2fa/verify
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      res.status(400).json({
        success: false,
        message: 'User ID and verification code are required'
      });
      return;
    }

    await initializeDatabase();
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if 2FA is enabled globally
    const authConfig = await getAuthConfig();
    if (!authConfig.twoFactorEnabled) {
      res.status(400).json({
        success: false,
        message: 'Two-factor authentication is not enabled for this system'
      });
      return;
    }

    // Verify the code
    const verification = verifyCode(userId, code);

    if (!verification.valid) {
      res.status(401).json({
        success: false,
        message: verification.message || 'Invalid verification code'
      });
      return;
    }

    // Generate new JWT token
    const tokenExpiration = `${authConfig.sessionTimeout}m`;

    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: tokenExpiration } as SignOptions
    );

    res.json({
      success: true,
      message: '2FA verification successful',
      data: {
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.isActive ? 'ACTIVE' : 'INACTIVE',
          profilePicture: user.avatarUrl,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify two-factor authentication'
    });
  }
});

/**
 * Disable 2FA
 * POST /api/2fa/disable
 */
router.post('/disable', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        success: false,
        message: 'Password is required to disable 2FA'
      });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    await initializeDatabase();
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.id } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
      return;
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorEmail = undefined;
    await userRepository.save(user);

    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable two-factor authentication'
    });
  }
});

/**
 * Get 2FA status
 * GET /api/2fa/status
 */
router.get('/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
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
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    await initializeDatabase();
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.id } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if 2FA is enabled globally
    const authConfig = await getAuthConfig();

    res.json({
      success: true,
      data: {
        enabled: user.twoFactorEnabled,
        globallyEnabled: authConfig.twoFactorEnabled,
        email: user.twoFactorEmail ? `${user.twoFactorEmail.substring(0, 3)}***@${user.twoFactorEmail.split('@')[1]}` : undefined
      }
    });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get 2FA status'
    });
  }
});

export default router;
