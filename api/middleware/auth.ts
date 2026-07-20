import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../entities/User';
import { hasRolePermission, isAdmin, isSuperAdmin, canManageUser } from '../utils/roleHierarchy';

interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  position?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface AuthenticatedRequestWithFile extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

/**
 * Middleware to verify JWT token and authenticate user
 */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    return res.status(500).json({ message: 'Server configuration error' });
  }

  jwt.verify(token, JWT_SECRET, (err: jwt.VerifyErrors | null, user: string | jwt.JwtPayload | undefined) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    req.user = user as JwtPayload;
    next();
  });
};

const getEffectiveRoles = (user: JwtPayload): UserRole[] => {
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles;
  }
  return [user.role];
};

/**
 * Middleware to check if user has admin privileges (ADMIN or SUPERADMIN)
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !('role' in req.user) || !getEffectiveRoles(req.user).some(isAdmin)) {
    return res.status(403).json({ message: 'Admin privileges required' });
  }
  next();
};

/**
 * Middleware to check if user has superadmin privileges
 */
export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !('role' in req.user) || !getEffectiveRoles(req.user).some(isSuperAdmin)) {
    return res.status(403).json({ message: 'Super admin privileges required' });
  }
  next();
};

/**
 * Factory function to create role-based middleware
 * @param requiredRole - The minimum role required to access the resource
 */
export const requireRole = (requiredRole: UserRole | UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !('role' in req.user)) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const effectiveRoles = getEffectiveRoles(req.user);

    // Handle array of roles (OR logic - check if user has ANY of the required roles or higher)
    if (Array.isArray(requiredRole)) {
      // For each role in the array, check if the user meets the hierarchy requirement
      // If user meets requirement for ANY of the roles, they are allowed
      // E.g. [REGISTRAR, STUDENT] -> User must be >= REGISTRAR OR >= STUDENT
      const hasPermission = requiredRole.some(role => effectiveRoles.some(userRole => hasRolePermission(userRole, role)));
      if (!hasPermission) {
        return res.status(403).json({ 
          message: `You do not have permission to perform this action.` 
        });
      }
    } 
    // Handle single role (Hierarchical logic)
    else if (!effectiveRoles.some(userRole => hasRolePermission(userRole, requiredRole))) {
      return res.status(403).json({ 
        message: `${requiredRole} privileges or higher required` 
      });
    }
    
    next();
  };
};

/**
 * Factory function to create role-based middleware that accepts multiple roles
 * @param allowedRoles - Array of roles that are allowed to access the resource
 */
export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !('role' in req.user)) {
      return res.status(403).json({ 
        message: 'Authentication required' 
      });
    }

    const effectiveRoles = getEffectiveRoles(req.user);

    if (effectiveRoles.some(isSuperAdmin)) {
      return next();
    }

    // Check if user's role is in the allowed roles array
    const hasPermission = effectiveRoles.some(role => allowedRoles.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({ 
        message: `One of the following roles required: ${allowedRoles.join(', ')}` 
      });
    }
    next();
  };
};

/**
 * Middleware to check if user can manage another user
 * Expects targetUserId in req.params or req.body
 */
export const requireUserManagementPermission = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !('role' in req.user)) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // For user management operations, we need to check the target user's role
  // This will be validated in the route handler with the actual target user data
  if (!isAdmin(req.user.role)) {
    return res.status(403).json({ 
      message: 'Admin privileges required for user management' 
    });
  }

  next();
};

/**
 * Helper function to validate user management permission against target user
 * @param managerRole - Role of the user performing the action
 * @param targetRole - Role of the user being managed
 * @returns boolean indicating if action is allowed
 */
export const validateUserManagementPermission = (managerRole: UserRole, targetRole: UserRole): boolean => {
  return canManageUser(managerRole, targetRole);
};

/**
 * Middleware for routes that require authentication but no specific role
 */
export const requireAuth = authenticateToken;

/**
 * Middleware combinations for common use cases
 */
export const requireAuthenticatedAdmin = [authenticateToken, requireAdmin];
export const requireAuthenticatedSuperAdmin = [authenticateToken, requireSuperAdmin];
export const requireAuthenticatedUserManager = [authenticateToken, requireUserManagementPermission];
