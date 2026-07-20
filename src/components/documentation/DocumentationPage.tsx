import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, User, AlertCircle } from 'lucide-react';
import { DocumentationLayout } from './DocumentationLayout';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useAuth } from '../../hooks/useAuth';
import { DocumentationService } from '../../services/documentationService';
import { DocumentationItem, hasDocumentationAccess } from '../../utils/documentationPermissions';

export const DocumentationPage: React.FC = () => {
  const { category, slug } = useParams<{ category: string; slug?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [content, setContent] = useState<DocumentationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      if (!category) {
        setError('Invalid documentation path');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const doc = await DocumentationService.getDocumentation(category, slug);

        if (!doc) {
          setError('Documentation not found');
          setContent(null);
        } else {
          const canView = hasDocumentationAccess(user?.role, doc.metadata.roles);
          if (!canView) {
            setError('Access denied');
            setContent(null);
          } else {
            setContent(doc);
          }
        }
      } catch (err) {
        console.error('Error loading documentation:', err);
        setError('Failed to load documentation');
        setContent(null);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [category, slug, user]);

  const handleNavigation = async (direction: 'prev' | 'next') => {
    if (!content) return;

    try {
      const allDocs = await DocumentationService.getAllDocumentation();

      // Filter documents based on user role
      const accessibleDocs = allDocs.filter(doc => {
        return !user?.role || doc.metadata.roles.includes(user.role);
      });

      // Get documents in current category that user can access
      const categoryDocs = accessibleDocs
        .filter(doc => doc.category === content.category)
        .sort((a, b) => a.metadata.order - b.metadata.order);

      // Find current document index
      const currentIndex = categoryDocs.findIndex(doc => doc.id === content.id);

      if (currentIndex === -1) {
        // If current doc not found in accessible docs, try all accessible docs
        const allAccessibleSorted = accessibleDocs.sort((a, b) => {
          const categoryOrder = ['overview', 'getting-started', 'dashboards', 'features', 'reference', 'troubleshooting'];
          const catCompare = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
          if (catCompare !== 0) return catCompare;
          return a.metadata.order - b.metadata.order;
        });

        const currentIndexInAll = allAccessibleSorted.findIndex(doc => doc.id === content.id);
        if (currentIndexInAll === -1) return;

        const newIndex = direction === 'next' ? currentIndexInAll + 1 : currentIndexInAll - 1;
        if (newIndex >= 0 && newIndex < allAccessibleSorted.length) {
          navigate(allAccessibleSorted[newIndex].path);
        }
        return;
      }

      // Calculate next/prev index within category
      const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

      // Check bounds within category
      if (newIndex < 0 || newIndex >= categoryDocs.length) {
        // Try to navigate to next/prev category
        const allCategories = ['overview', 'getting-started', 'dashboards', 'features', 'reference', 'troubleshooting'];
        const currentCategoryIndex = allCategories.indexOf(content.category);

        if (direction === 'next' && currentCategoryIndex < allCategories.length - 1) {
          // Go to first accessible item of next category
          for (let i = currentCategoryIndex + 1; i < allCategories.length; i++) {
            const nextCategory = allCategories[i];
            const nextCategoryDocs = accessibleDocs
              .filter(doc => doc.category === nextCategory)
              .sort((a, b) => a.metadata.order - b.metadata.order);
            if (nextCategoryDocs.length > 0) {
              navigate(nextCategoryDocs[0].path);
              return;
            }
          }
        } else if (direction === 'prev' && currentCategoryIndex > 0) {
          // Go to last accessible item of previous category
          for (let i = currentCategoryIndex - 1; i >= 0; i--) {
            const prevCategory = allCategories[i];
            const prevCategoryDocs = accessibleDocs
              .filter(doc => doc.category === prevCategory)
              .sort((a, b) => a.metadata.order - b.metadata.order);
            if (prevCategoryDocs.length > 0) {
              navigate(prevCategoryDocs[prevCategoryDocs.length - 1].path);
              return;
            }
          }
        }
        return;
      }

      // Navigate to next/prev document in same category
      const targetDoc = categoryDocs[newIndex];
      navigate(targetDoc.path);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  if (loading) {
    return (
      <DocumentationLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading documentation...</span>
        </div>
      </DocumentationLayout>
    );
  }

  if (error) {
    return (
      <DocumentationLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Documentation Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/documentation')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Documentation
          </button>
        </div>
      </DocumentationLayout>
    );
  }

  if (!content) {
    return (
      <DocumentationLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Content Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The requested documentation could not be found.</p>
          <button
            onClick={() => navigate('/documentation')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Documentation
          </button>
        </div>
      </DocumentationLayout>
    );
  }

  return (
    <DocumentationLayout>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <button
            onClick={() => navigate('/documentation')}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Documentation
          </button>
          <span>/</span>
          <button
            onClick={() => navigate(`/documentation/${category}`)}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors capitalize"
          >
            {category.replace('-', ' ')}
          </button>
          {slug && (
            <>
              <span>/</span>
              <span className="text-gray-900 dark:text-gray-100 capitalize">{slug.replace('-', ' ')}</span>
            </>
          )}
        </nav>

        {/* Content Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {content.metadata.title}
          </h1>

          {content.metadata.description && (
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              {content.metadata.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-4">
            {content.metadata.lastUpdated && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Updated {content.metadata.lastUpdated}</span>
              </div>
            )}

            {content.metadata.author && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>By {content.metadata.author}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
          <MarkdownRenderer content={content.content} />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-8 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => handleNavigation('prev')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <button
            onClick={() => handleNavigation('next')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </DocumentationLayout>
  );
};
