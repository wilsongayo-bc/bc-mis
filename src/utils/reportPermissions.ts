/**
 * Report permissions utility
 * Defines which user roles can access different types of reports
 */

import { UserRole } from './roleHierarchy';

export interface ReportPermissions {
  canViewDashboard: boolean;
  canViewCompliance: boolean;
  canViewExpiration: boolean;
  canViewAcademic: boolean;
  canViewFinancial: boolean;
  canExportReports: boolean;
  canViewSensitiveData: boolean;
}

/**
 * Get report permissions based on user role
 * @param userRole - The role of the current user
 * @returns ReportPermissions object with access flags
 */
export function getReportPermissions(userRole: UserRole): ReportPermissions {
  switch (userRole) {
    case 'SUPERADMIN':
      return {
        canViewDashboard: true,
        canViewCompliance: true,
        canViewExpiration: true,
        canViewAcademic: true,
        canViewFinancial: true,
        canExportReports: true,
        canViewSensitiveData: true,
      };

    case 'ADMIN':
      return {
        canViewDashboard: true,
        canViewCompliance: true,
        canViewExpiration: true,
        canViewAcademic: true,
        canViewFinancial: true,
        canExportReports: true,
        canViewSensitiveData: true,
      };

    case 'REGISTRAR':
      return {
        canViewDashboard: true,
        canViewCompliance: true,
        canViewExpiration: true,
        canViewAcademic: true,
        canViewFinancial: false,
        canExportReports: true,
        canViewSensitiveData: false,
      };

    case 'FINANCE':
      return {
        canViewDashboard: true,
        canViewCompliance: false,
        canViewExpiration: false,
        canViewAcademic: false,
        canViewFinancial: true,
        canExportReports: true,
        canViewSensitiveData: false,
      };

    case 'TEACHER':
      return {
        canViewDashboard: true,
        canViewCompliance: false,
        canViewExpiration: false,
        canViewAcademic: true,
        canViewFinancial: false,
        canExportReports: false,
        canViewSensitiveData: false,
      };

    case 'LIBRARIAN':
      return {
        canViewDashboard: true,
        canViewCompliance: true,
        canViewExpiration: true,
        canViewAcademic: false,
        canViewFinancial: false,
        canExportReports: false,
        canViewSensitiveData: false,
      };

    case 'STAFF':
      return {
        canViewDashboard: true,
        canViewCompliance: false,
        canViewExpiration: false,
        canViewAcademic: false,
        canViewFinancial: false,
        canExportReports: false,
        canViewSensitiveData: false,
      };

    case 'STUDENT':
      return {
        canViewDashboard: false,
        canViewCompliance: false,
        canViewExpiration: false,
        canViewAcademic: false,
        canViewFinancial: false,
        canExportReports: false,
        canViewSensitiveData: false,
      };

    default:
      return {
        canViewDashboard: false,
        canViewCompliance: false,
        canViewExpiration: false,
        canViewAcademic: false,
        canViewFinancial: false,
        canExportReports: false,
        canViewSensitiveData: false,
      };
  }
}

/**
 * Check if user has permission to access a specific report tab
 * @param userRole - The role of the current user
 * @param tabId - The ID of the tab to check
 * @returns boolean indicating if access is allowed
 */
export function canAccessReportTab(userRole: UserRole, tabId: string): boolean {
  const permissions = getReportPermissions(userRole);
  
  switch (tabId) {
    case 'dashboard':
      return permissions.canViewDashboard;
    case 'compliance':
      return permissions.canViewCompliance;
    case 'expiration':
      return permissions.canViewExpiration;
    case 'academic':
      return permissions.canViewAcademic;
    case 'financial':
      return permissions.canViewFinancial;
    case 'teacher-load':
      return permissions.canViewAcademic;
    case 'enrollments':
      return permissions.canViewAcademic; // Dweezil's Code - Enrollment report access
    default:
      return false;
  }
}

// Dweezil's Code - Get accessible tabs for a user role
export function getAccessibleTabs(userRole: UserRole): string[] {
  const permissions = getReportPermissions(userRole);
  const tabs: string[] = [];
  
  if (permissions.canViewDashboard) tabs.push('dashboard');
  if (permissions.canViewCompliance) tabs.push('compliance');
  if (permissions.canViewExpiration) tabs.push('expiration');
  if (permissions.canViewAcademic) {
    tabs.push('academic');
    tabs.push('teacher-load');
    tabs.push('enrollments'); // Dweezil's Code - Add enrollment report tab
  }
  if (permissions.canViewFinancial) tabs.push('financial');
  
  return tabs;
}
