import { UserRole } from '../types/auth';
import { DocumentationItem, DocumentMetadata } from '../utils/documentationPermissions';

// Import markdown files
import systemOverviewMd from '../documentation/overview/system-overview.md?raw';
import adminGuideMd from '../documentation/getting-started/admin.md?raw';
import teacherGuideMd from '../documentation/getting-started/teacher.md?raw';
import studentGuideMd from '../documentation/getting-started/student.md?raw';
import registrarGuideMd from '../documentation/getting-started/registrar.md?raw';
import librarianGuideMd from '../documentation/getting-started/librarian.md?raw';
import financeGuideMd from '../documentation/getting-started/finance.md?raw';
import featureGuideMd from '../documentation/features/complete-feature-guide.md?raw';
import quickReferenceMd from '../documentation/reference/quick-reference.md?raw';
import adminPasswordResetMd from '../documentation/reference/admin-password-reset.md?raw';
import emailVerificationMd from '../documentation/reference/email-verification.md?raw';
import passwordResetMd from '../documentation/reference/password-reset.md?raw';
import troubleshootingMd from '../documentation/troubleshooting/common-issues.md?raw';
import adminDashboardMd from '../documentation/dashboards/admin-dashboard.md?raw';
import registrarDashboardMd from '../documentation/dashboards/registrar-dashboard.md?raw';
import teacherDashboardMd from '../documentation/dashboards/teacher-dashboard.md?raw';
import studentDashboardMd from '../documentation/dashboards/student-dashboard.md?raw';

// Helper function to parse markdown frontmatter
function parseMarkdown(content: string): { metadata: DocumentMetadata; content: string } {
  // Handle both Unix (\n) and Windows (\r\n) line endings
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = normalizedContent.match(frontmatterRegex);

  if (!match) {
    console.warn('⚠️ No frontmatter found in markdown');
    console.warn('Content preview:', content.substring(0, 100));
    return {
      metadata: {
        title: 'Untitled',
        description: '',
        roles: ['ADMIN', 'SUPERADMIN'] as UserRole[],
        category: 'overview',
        order: 1
      },
      content: content
    };
  }

  const frontmatter = match[1];
  const markdownContent = match[2];

  const metadata: Record<string, unknown> = {
    roles: ['ADMIN', 'SUPERADMIN'] as UserRole[],
    category: 'overview',
    order: 1,
    title: '',
    description: ''
  };

  // Parse each line of frontmatter
  frontmatter.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      // Skip empty values
      if (!value) return;

      if (key === 'roles' || key === 'tags') {
        try {
          metadata[key] = JSON.parse(value.replace(/'/g, '"'));
        } catch (_e) {
          console.warn(`Failed to parse ${key}:`, value);
          metadata[key] = [];
        }
      } else if (key === 'order') {
        metadata[key] = parseInt(value) || 1;
      } else {
        // Remove surrounding quotes from values (both single and double)
        metadata[key] = value.replace(/^["'](.*)["']$/, '$1');
      }
    }
  });

  console.log('✅ Parsed metadata:', metadata);

  return {
    metadata: {
      title: typeof metadata.title === 'string' ? (metadata.title as string) : 'Untitled',
      description: typeof metadata.description === 'string' ? (metadata.description as string) : '',
      roles: Array.isArray(metadata.roles) ? (metadata.roles as UserRole[]) : (['ADMIN', 'SUPERADMIN'] as UserRole[]),
      category: typeof metadata.category === 'string' ? (metadata.category as string) : 'overview',
      order: typeof metadata.order === 'number' ? (metadata.order as number) : (parseInt(String(metadata.order)) || 1),
      lastUpdated: typeof metadata.lastUpdated === 'string' ? (metadata.lastUpdated as string) : undefined,
      author: typeof metadata.author === 'string' ? (metadata.author as string) : undefined,
      tags: Array.isArray(metadata.tags) ? (metadata.tags as string[]) : undefined,
    },
    content: markdownContent
  };
}

// Documentation content loaded from markdown files
const documentationContent: Record<string, { content: string; metadata: DocumentMetadata }> = {};

// Initialize documentation content
try {
  documentationContent['overview'] = parseMarkdown(systemOverviewMd);
  documentationContent['overview/system-overview'] = parseMarkdown(systemOverviewMd);
  documentationContent['getting-started/admin'] = parseMarkdown(adminGuideMd);
  documentationContent['getting-started/teacher'] = parseMarkdown(teacherGuideMd);
  documentationContent['getting-started/student'] = parseMarkdown(studentGuideMd);
  documentationContent['getting-started/registrar'] = parseMarkdown(registrarGuideMd);
  documentationContent['getting-started/librarian'] = parseMarkdown(librarianGuideMd);
  documentationContent['getting-started/finance'] = parseMarkdown(financeGuideMd);
  documentationContent['features'] = parseMarkdown(featureGuideMd);
  documentationContent['features/complete-feature-guide'] = parseMarkdown(featureGuideMd);
  documentationContent['reference'] = parseMarkdown(quickReferenceMd);
  documentationContent['reference/quick-reference'] = parseMarkdown(quickReferenceMd);
  documentationContent['reference/admin-password-reset'] = parseMarkdown(adminPasswordResetMd);
  documentationContent['reference/email-verification'] = parseMarkdown(emailVerificationMd);
  documentationContent['reference/password-reset'] = parseMarkdown(passwordResetMd);
  documentationContent['dashboards'] = parseMarkdown(adminDashboardMd);
  documentationContent['dashboards/admin-dashboard'] = parseMarkdown(adminDashboardMd);
  documentationContent['dashboards/registrar-dashboard'] = parseMarkdown(registrarDashboardMd);
  documentationContent['dashboards/teacher-dashboard'] = parseMarkdown(teacherDashboardMd);
  documentationContent['dashboards/student-dashboard'] = parseMarkdown(studentDashboardMd);
  documentationContent['troubleshooting'] = parseMarkdown(troubleshootingMd);
  documentationContent['troubleshooting/common-issues'] = parseMarkdown(troubleshootingMd);

  console.log('Documentation loaded successfully. Keys:', Object.keys(documentationContent));
} catch (error) {
  console.error('Error loading documentation:', error);
}

export class DocumentationService {
  /**
   * Get all available documentation items
   */
  static async getAllDocumentation(): Promise<DocumentationItem[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Filter out entries without slugs (they're just fallbacks for routing)
    // Only include entries with slugs (e.g., 'overview/system-overview', not 'overview')
    const items = Object.entries(documentationContent)
      .filter(([key]) => key.includes('/')) // Only include entries with slugs
      .map(([key, doc]) => {
        const [category, slug] = key.split('/');
        const item = {
          id: key,
          slug,
          category,
          metadata: doc.metadata,
          content: doc.content,
          path: `/documentation/${category}${slug ? `/${slug}` : ''}`
        };
        console.log('📄 Documentation item:', key, 'metadata:', doc.metadata);
        return item;
      });

    console.log('📚 Total documentation items:', items.length);
    return items;
  }

  /**
   * Get documentation by category and slug
   */
  static async getDocumentation(category: string, slug?: string): Promise<DocumentationItem | null> {
    const key = slug ? `${category}/${slug}` : category;
    const doc = documentationContent[key];

    if (!doc) {
      return null;
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Map category-only keys to their slug-based equivalents for consistent navigation
    const categoryToSlugMap: Record<string, string> = {
      'overview': 'overview/system-overview',
      'features': 'features/complete-feature-guide',
      'reference': 'reference/quick-reference',
      'dashboards': 'dashboards/admin-dashboard',
      'troubleshooting': 'troubleshooting/common-issues'
    };

    // Use slug-based id if accessing by category only
    const actualId = !slug && categoryToSlugMap[category] ? categoryToSlugMap[category] : key;
    const [actualCategory, actualSlug] = actualId.includes('/') ? actualId.split('/') : [category, ''];

    return {
      id: actualId,
      slug: actualSlug || slug || '',
      category: actualCategory,
      metadata: doc.metadata,
      content: doc.content,
      path: `/documentation/${category}${slug ? `/${slug}` : ''}`
    };
  }

  /**
   * Search documentation content
   */
  static async searchDocumentation(query: string, userRole?: UserRole): Promise<DocumentationItem[]> {
    const allDocs = await this.getAllDocumentation();

    if (!query.trim()) {
      return allDocs.filter(doc =>
        !userRole || doc.metadata.roles.includes(userRole)
      );
    }

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

    return allDocs.filter(doc => {
      // Check role access
      if (userRole && !doc.metadata.roles.includes(userRole)) {
        return false;
      }

      // Search in title, description, content, and tags
      const searchableText = [
        doc.metadata.title,
        doc.metadata.description,
        doc.content || '',
        ...(doc.metadata.tags || [])
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    }).sort((a, b) => {
      // Sort by relevance (title matches first, then description)
      const aTitle = a.metadata.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      const bTitle = b.metadata.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;

      if (aTitle !== bTitle) return bTitle - aTitle;

      const aDesc = a.metadata.description.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      const bDesc = b.metadata.description.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;

      return bDesc - aDesc;
    });
  }

  /**
   * Get documentation by category
   */
  static async getDocumentationByCategory(category: string, userRole?: UserRole): Promise<DocumentationItem[]> {
    const allDocs = await this.getAllDocumentation();

    return allDocs
      .filter(doc => {
        const matchesCategory = doc.category === category;
        const hasAccess = !userRole || doc.metadata.roles.includes(userRole);
        return matchesCategory && hasAccess;
      })
      .sort((a, b) => a.metadata.order - b.metadata.order);
  }

  /**
   * Get navigation structure for a user role
   */
  static getNavigationStructure(userRole?: UserRole) {
    const navigation = [
      {
        title: 'Overview',
        path: '/documentation/overview',
        category: 'overview',
        roles: ['ADMIN', 'SUPERADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR', 'LIBRARIAN', 'FINANCE', 'STAFF'] as UserRole[],
        icon: 'Home'
      },
      {
        title: 'Getting Started',
        path: '/documentation/getting-started',
        category: 'getting-started',
        roles: ['ADMIN', 'SUPERADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR', 'LIBRARIAN', 'FINANCE', 'STAFF'] as UserRole[],
        icon: 'Book',
        children: [
          {
            title: 'Administrator Guide',
            path: '/documentation/getting-started/admin',
            roles: ['ADMIN', 'SUPERADMIN'] as UserRole[]
          },
          {
            title: 'Teacher Guide',
            path: '/documentation/getting-started/teacher',
            roles: ['TEACHER', 'ADMIN', 'SUPERADMIN'] as UserRole[]
          },
          {
            title: 'Student Guide',
            path: '/documentation/getting-started/student',
            roles: ['STUDENT', 'ADMIN', 'SUPERADMIN'] as UserRole[]
          },
          {
            title: 'Registrar Guide',
            path: '/documentation/getting-started/registrar',
            roles: ['REGISTRAR', 'ADMIN', 'SUPERADMIN'] as UserRole[]
          },
          {
            title: 'Librarian Guide',
            path: '/documentation/getting-started/librarian',
            roles: ['LIBRARIAN', 'ADMIN', 'SUPERADMIN'] as UserRole[]
          },
          {
            title: 'Finance Guide',
            path: '/documentation/getting-started/finance',
            roles: ['FINANCE', 'ADMIN', 'SUPERADMIN'] as UserRole[]
          }
        ]
      },
      {
        title: 'Dashboards',
        path: '/documentation/dashboards',
        category: 'dashboards',
        roles: ['ADMIN', 'SUPERADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR'] as UserRole[],
        icon: 'BarChart3',
        children: [
          {
            title: 'Admin Dashboard',
            path: '/documentation/dashboards/admin-dashboard',
            roles: ['ADMIN', 'SUPERADMIN'] as UserRole[]
          },
          {
            title: 'Registrar Dashboard',
            path: '/documentation/dashboards/registrar-dashboard',
            roles: ['REGISTRAR', 'ADMIN', 'SUPERADMIN'] as UserRole[]
          },
          {
            title: 'Teacher Dashboard',
            path: '/documentation/dashboards/teacher-dashboard',
            roles: ['TEACHER', 'ADMIN', 'SUPERADMIN'] as UserRole[]
          },
          {
            title: 'Student Dashboard',
            path: '/documentation/dashboards/student-dashboard',
            roles: ['STUDENT', 'ADMIN', 'SUPERADMIN'] as UserRole[]
          }
        ]
      },
      {
        title: 'Features',
        path: '/documentation/features',
        category: 'features',
        roles: ['ADMIN', 'SUPERADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR', 'LIBRARIAN', 'FINANCE', 'STAFF'] as UserRole[],
        icon: 'Lightbulb'
      },
      {
        title: 'Quick Reference',
        path: '/documentation/reference',
        category: 'reference',
        roles: ['ADMIN', 'SUPERADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR', 'LIBRARIAN', 'FINANCE', 'STAFF'] as UserRole[],
        icon: 'FileText'
      },
      {
        title: 'Troubleshooting',
        path: '/documentation/troubleshooting',
        category: 'troubleshooting',
        roles: ['ADMIN', 'SUPERADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR', 'LIBRARIAN', 'FINANCE', 'STAFF'] as UserRole[],
        icon: 'HelpCircle'
      }
    ];

    // Filter based on user role
    return navigation.filter(item =>
      !userRole || item.roles.includes(userRole)
    ).map(item => ({
      ...item,
      children: item.children?.filter(child =>
        !userRole || child.roles.includes(userRole)
      )
    }));
  }
}
