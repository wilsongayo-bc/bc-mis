import { UserRole } from '../types/auth';

export interface DocumentationPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

export interface DocumentMetadata {
  title: string;
  description: string;
  roles: UserRole[];
  category: string;
  order: number;
  lastUpdated?: string;
  author?: string;
  tags?: string[];
}

export interface DocumentationItem {
  id: string;
  slug: string;
  category: string;
  metadata: DocumentMetadata;
  content?: string;
  path: string;
}

/**
 * Check if a user has access to view specific documentation
 */
export const hasDocumentationAccess = (
  userRole: UserRole | undefined,
  requiredRoles: UserRole[]
): boolean => {
  if (!userRole) return false;
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.includes(userRole);
};

/**
 * Get documentation permissions for a user role
 */
export const getDocumentationPermissions = (
  userRole: UserRole | undefined,
  documentRoles: UserRole[]
): DocumentationPermissions => {
  const canView = hasDocumentationAccess(userRole, documentRoles);
  
  // Only admins and superadmins can edit/delete/create documentation
  const canEdit = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
  const canDelete = userRole === 'SUPERADMIN';
  const canCreate = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  return {
    canView,
    canEdit,
    canDelete,
    canCreate
  };
};

/**
 * Filter documentation items based on user role
 */
export const filterDocumentationByRole = (
  items: DocumentationItem[],
  userRole: UserRole | undefined
): DocumentationItem[] => {
  return items.filter(item => 
    hasDocumentationAccess(userRole, item.metadata.roles)
  );
};

/**
 * Get role-specific navigation items
 */
export const getRoleBasedNavigation = (userRole: UserRole | undefined) => {
  const baseNavigation = [
    {
      title: 'Overview',
      path: '/documentation/overview',
      roles: ['ADMIN', 'SUPERADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR', 'LIBRARIAN', 'FINANCE', 'STAFF'] as UserRole[],
      icon: 'Home'
    },
    {
      title: 'Getting Started',
      path: '/documentation/getting-started',
      roles: ['ADMIN', 'SUPERADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR', 'LIBRARIAN', 'FINANCE', 'STAFF'] as UserRole[],
      icon: 'Book',
      children: [
        {
          title: 'Administrator Guide',
          path: '/documentation/getting-started/admin',
          roles: ['ADMIN', 'SUPERADMIN'] as UserRole[],
          icon: 'Settings'
        },
        {
          title: 'Teacher Guide',
          path: '/documentation/getting-started/teacher',
          roles: ['TEACHER', 'ADMIN', 'SUPERADMIN'] as UserRole[],
          icon: 'Book'
        },
        {
          title: 'Student Guide',
          path: '/documentation/getting-started/student',
          roles: ['STUDENT', 'ADMIN', 'SUPERADMIN'] as UserRole[],
          icon: 'FileText'
        },
        {
          title: 'Registrar Guide',
          path: '/documentation/getting-started/registrar',
          roles: ['REGISTRAR', 'ADMIN', 'SUPERADMIN'] as UserRole[],
          icon: 'FileText'
        },
        {
          title: 'Librarian Guide',
          path: '/documentation/getting-started/librarian',
          roles: ['LIBRARIAN', 'ADMIN', 'SUPERADMIN'] as UserRole[],
          icon: 'Book'
        },
        {
          title: 'Finance Guide',
          path: '/documentation/getting-started/finance',
          roles: ['FINANCE', 'ADMIN', 'SUPERADMIN'] as UserRole[],
          icon: 'DollarSign'
        }
      ]
    },
    {
      title: 'Features',
      path: '/documentation/features',
      roles: ['ADMIN', 'SUPERADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR', 'LIBRARIAN', 'FINANCE', 'STAFF'] as UserRole[],
      icon: 'Lightbulb'
    },
    {
      title: 'Quick Reference',
      path: '/documentation/reference',
      roles: ['ADMIN', 'SUPERADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR', 'LIBRARIAN', 'FINANCE', 'STAFF'] as UserRole[],
      icon: 'FileText'
    },
    {
      title: 'Troubleshooting',
      path: '/documentation/troubleshooting',
      roles: ['ADMIN', 'SUPERADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR', 'LIBRARIAN', 'FINANCE', 'STAFF'] as UserRole[],
      icon: 'HelpCircle'
    }
  ];

  return baseNavigation.filter(item => 
    hasDocumentationAccess(userRole, item.roles)
  ).map(item => ({
    ...item,
    children: item.children?.filter(child => 
      hasDocumentationAccess(userRole, child.roles)
    )
  }));
};

/**
 * Get role-specific content sections
 */
export const getRoleSpecificSections = (userRole: UserRole | undefined): string[] => {
  const roleSections: Record<UserRole, string[]> = {
    SUPERADMIN: [
      'system-administration',
      'user-management',
      'security-settings',
      'database-management',
      'system-monitoring',
      'backup-recovery'
    ],
    ADMIN: [
      'user-management',
      'department-management',
      'academic-management',
      'financial-oversight',
      'reporting',
      'system-settings'
    ],
    TEACHER: [
      'course-management',
      'student-grading',
      'attendance-tracking',
      'schedule-management',
      'academic-progress',
      'communication'
    ],
    STUDENT: [
      'academic-information',
      'schedule-viewing',
      'grade-checking',
      'library-services',
      'payment-information',
      'profile-management'
    ],
    REGISTRAR: [
      'student-enrollment',
      'course-scheduling',
      'academic-records',
      'transcript-management',
      'graduation-requirements',
      'document-management'
    ],
    LIBRARIAN: [
      'book-management',
      'borrowing-system',
      'inventory-management',
      'library-reports',
      'user-services',
      'catalog-management'
    ],
    FINANCE: [
      'payment-processing',
      'fee-management',
      'financial-reporting',
      'budget-management',
      'payment-tracking',
      'financial-analytics'
    ],
    STAFF: [
      'basic-operations',
      'information-access',
      'support-functions',
      'limited-reporting'
    ]
  };

  return userRole ? roleSections[userRole] || [] : [];
};

/**
 * Check if user can access a specific feature section
 */
export const canAccessFeatureSection = (
  userRole: UserRole | undefined,
  sectionId: string
): boolean => {
  const userSections = getRoleSpecificSections(userRole);
  return userSections.includes(sectionId);
};

/**
 * Get priority order for documentation based on user role
 */
export const getDocumentationPriority = (userRole: UserRole | undefined): Record<string, number> => {
  const priorities: Record<UserRole, Record<string, number>> = {
    SUPERADMIN: {
      'system-administration': 1,
      'user-management': 2,
      'security-settings': 3,
      'overview': 4,
      'troubleshooting': 5
    },
    ADMIN: {
      'user-management': 1,
      'academic-management': 2,
      'reporting': 3,
      'overview': 4,
      'troubleshooting': 5
    },
    TEACHER: {
      'getting-started': 1,
      'course-management': 2,
      'student-grading': 3,
      'features': 4,
      'reference': 5
    },
    STUDENT: {
      'getting-started': 1,
      'academic-information': 2,
      'schedule-viewing': 3,
      'library-services': 4,
      'reference': 5
    },
    REGISTRAR: {
      'student-enrollment': 1,
      'course-scheduling': 2,
      'academic-records': 3,
      'getting-started': 4,
      'reference': 5
    },
    LIBRARIAN: {
      'book-management': 1,
      'borrowing-system': 2,
      'inventory-management': 3,
      'getting-started': 4,
      'reference': 5
    },
    FINANCE: {
      'payment-processing': 1,
      'fee-management': 2,
      'financial-reporting': 3,
      'getting-started': 4,
      'reference': 5
    },
    STAFF: {
      'getting-started': 1,
      'basic-operations': 2,
      'reference': 3,
      'troubleshooting': 4,
      'overview': 5
    }
  };

  return userRole ? priorities[userRole] || {} : {};
};

/**
 * Search documentation with role-based filtering
 */
export const searchDocumentation = (
  query: string,
  items: DocumentationItem[],
  userRole: UserRole | undefined
): DocumentationItem[] => {
  const accessibleItems = filterDocumentationByRole(items, userRole);
  
  if (!query.trim()) {
    return accessibleItems;
  }

  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
  
  return accessibleItems.filter(item => {
    const searchableText = [
      item.metadata.title,
      item.metadata.description,
      item.category,
      ...(item.metadata.tags || []),
      item.content || ''
    ].join(' ').toLowerCase();

    return searchTerms.every(term => searchableText.includes(term));
  }).sort((a, b) => {
    // Sort by relevance (title matches first, then description, then content)
    const aTitle = a.metadata.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
    const bTitle = b.metadata.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
    
    if (aTitle !== bTitle) return bTitle - aTitle;
    
    const aDesc = a.metadata.description.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
    const bDesc = b.metadata.description.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
    
    return bDesc - aDesc;
  });
};