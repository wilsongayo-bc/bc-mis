import { UserRole } from '../entities/User';

/**
 * Role hierarchy levels - higher numbers have more privileges
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.STUDENT]: 1,
  [UserRole.TEACHER]: 2,
  [UserRole.STAFF]: 2,
  [UserRole.REGISTRAR]: 3,
  [UserRole.LIBRARIAN]: 3,
  [UserRole.FINANCE]: 3,
  [UserRole.ADMIN]: 4,
  [UserRole.SUPERADMIN]: 5
};

/**
 * Check if a user role has permission to access a resource requiring a minimum role
 * @param userRole - The role of the current user
 * @param requiredRole - The minimum role required for the action
 * @returns true if user has sufficient privileges
 */
export function hasRolePermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a user can manage (create, update, delete) another user
 * @param managerRole - The role of the user performing the action
 * @param targetRole - The role of the user being managed
 * @returns true if manager can manage the target user
 */
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  // SUPERADMIN can manage anyone
  if (managerRole === UserRole.SUPERADMIN) {
    return true;
  }
  
  // ADMIN can manage everyone except SUPERADMIN
  if (managerRole === UserRole.ADMIN) {
    return targetRole !== UserRole.SUPERADMIN;
  }
  
  // Other roles cannot manage users
  return false;
}

/**
 * Check if a user is an admin (ADMIN or SUPERADMIN)
 * @param userRole - The role to check
 * @returns true if user is admin or superadmin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;
}

/**
 * Check if a user is a superadmin
 * @param userRole - The role to check
 * @returns true if user is superadmin
 */
export function isSuperAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.SUPERADMIN;
}

/**
 * Get all roles that a user can manage
 * @param managerRole - The role of the manager
 * @returns Array of roles that can be managed
 */
export function getManageableRoles(managerRole: UserRole): UserRole[] {
  if (managerRole === UserRole.SUPERADMIN) {
    return Object.values(UserRole);
  }
  
  if (managerRole === UserRole.ADMIN) {
    return Object.values(UserRole).filter(role => role !== UserRole.SUPERADMIN);
  }
  
  return [];
}

/**
 * Check if a role has higher privileges than another
 * @param role1 - First role to compare
 * @param role2 - Second role to compare
 * @returns true if role1 has higher privileges than role2
 */
export function hasHigherPrivileges(role1: UserRole, role2: UserRole): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}