import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { AppDataSource } from '../config/database';
import { Settings } from '../entities/Settings';

/**
 * Get authentication configuration settings
 */
export const getAuthConfig = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      return {
        sessionTimeout: 30,
        minPasswordLength: 8,
        requireSpecialChars: true,
        twoFactorEnabled: false
      };
    }

    const settingsRepository = AppDataSource.getRepository(Settings);
    const settings = await settingsRepository.find({
      where: [
        { key: 'session_timeout' },
        { key: 'min_password_length' },
        { key: 'require_special_chars' },
        { key: 'two_factor_enabled' }
      ]
    });

    const config = {
      sessionTimeout: 30,
      minPasswordLength: 8,
      requireSpecialChars: true,
      twoFactorEnabled: false
    };

    settings.forEach(setting => {
      switch (setting.key) {
        case 'session_timeout':
          config.sessionTimeout = parseInt(setting.value) || 30;
          break;
        case 'min_password_length':
          config.minPasswordLength = parseInt(setting.value) || 8;
          break;
        case 'require_special_chars':
          config.requireSpecialChars = setting.value === 'true';
          break;
        case 'two_factor_enabled':
          config.twoFactorEnabled = setting.value === 'true';
          break;
      }
    });

    return config;
  } catch (error) {
    console.error('Error fetching auth config:', error);
    return {
      sessionTimeout: 30,
      minPasswordLength: 8,
      requireSpecialChars: true,
      twoFactorEnabled: false
    };
  }
};

/**
 * Validate password against configured requirements
 */
export const validatePassword = async (password: string): Promise<{ valid: boolean; message?: string }> => {
  const config = await getAuthConfig();

  // Check minimum length
  if (password.length < config.minPasswordLength) {
    return {
      valid: false,
      message: `Password must be at least ${config.minPasswordLength} characters long`
    };
  }

  // Check for special characters if required
  if (config.requireSpecialChars) {
    const specialCharsRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharsRegex.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one special character (!@#$%^&*)'
      };
    }
  }

  return { valid: true };
};

/**
 * Middleware to check session timeout
 * This should be added to protected routes
 */
export const checkSessionTimeout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user || !user.iat) {
      return next();
    }

    const config = await getAuthConfig();
    const minutesSinceLogin = (Date.now() - user.iat * 1000) / (1000 * 60);

    if (minutesSinceLogin > config.sessionTimeout) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        code: 'SESSION_EXPIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking session timeout:', error);
    next();
  }
};

/**
 * Get password requirements for client-side validation
 */
export const getPasswordRequirements = async () => {
  const config = await getAuthConfig();
  return {
    minLength: config.minPasswordLength,
    requireSpecialChars: config.requireSpecialChars,
    message: `Password must be at least ${config.minPasswordLength} characters${
      config.requireSpecialChars ? ' and contain at least one special character (!@#$%^&*)' : ''
    }`
  };
};
