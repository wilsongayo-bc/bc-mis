import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Book, Clock, User, ChevronRight, Search, CheckSquare, AlertCircle } from 'lucide-react';
import { DocumentationLayout } from './DocumentationLayout';
import { useAuth } from '../../hooks/useAuth';
import { DocumentationService } from '../../services/documentationService';
import { DocumentationItem, filterDocumentationByRole } from '../../utils/documentationPermissions';

export const DocumentationIndex: React.FC = () => {
  const { user } = useAuth();
  const [documentationItems, setDocumentationItems] = useState<DocumentationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<DocumentationItem[]>([]);

  useEffect(() => {
    const loadDocumentation = async () => {
      try {
        console.log('📚 DocumentationIndex: Loading documentation...');
        const items = await DocumentationService.getAllDocumentation();
        console.log('📚 DocumentationIndex: Items loaded:', items.length);
        console.log('📚 DocumentationIndex: Items:', items);

        const scoped = filterDocumentationByRole(items, user?.role);
        setDocumentationItems(scoped);
        setFilteredItems(scoped);
      } catch (error) {
        console.error('❌ DocumentationIndex: Error loading documentation:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDocumentation();
  }, [user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(documentationItems);
      return;
    }

    const filtered = documentationItems.filter(item => {
      const searchText = [
        item.metadata.title,
        item.metadata.description,
        item.category,
        ...(item.metadata.tags || [])
      ].join(' ').toLowerCase();

      return searchText.includes(searchQuery.toLowerCase());
    });

    setFilteredItems(filtered);
  }, [searchQuery, documentationItems]);

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, DocumentationItem[]>);

  console.log('📚 DocumentationIndex: Grouped items:', groupedItems);
  console.log('📚 DocumentationIndex: Filtered items count:', filteredItems.length);

  const getCategoryTitle = (category: string) => {
    const titles: Record<string, string> = {
      'overview': 'System Overview',
      'getting-started': 'Getting Started',
      'features': 'Features',
      'reference': 'Quick Reference',
      'troubleshooting': 'Troubleshooting'
    };
    return titles[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getCategoryDescription = (category: string) => {
    const descriptions: Record<string, string> = {
      'overview': 'Learn about the system architecture and core concepts',
      'getting-started': 'Role-specific guides to help you get started quickly',
      'features': 'Detailed documentation of system features and capabilities',
      'reference': 'Quick reference guides and common actions',
      'troubleshooting': 'Solutions to common problems and issues'
    };
    return descriptions[category] || '';
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

  return (
    <DocumentationLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Documentation Center
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Welcome to the Benedict College Management Information System documentation.
            Find guides, references, and help for your role.
          </p>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* User Role Info - Removed since all users see all documentation */}

        {/* Documentation Sections */}
        {Object.keys(groupedItems).length === 0 ? (
          <div className="text-center py-12">
            <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No documentation found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ?
                `No results found for "${searchQuery}"` :
                'No documentation available'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedItems)
              .sort(([a], [b]) => {
                const order = ['overview', 'getting-started', 'features', 'reference', 'troubleshooting'];
                return order.indexOf(a) - order.indexOf(b);
              })
              .map(([category, items]) => (
                <div key={category} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {getCategoryTitle(category)}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {getCategoryDescription(category)}
                    </p>
                  </div>

                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items
                      .sort((a, b) => a.metadata.order - b.metadata.order)
                      .map((item) => (
                        <Link
                          key={item.id}
                          to={item.path}
                          className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {item.metadata.title}
                              </h3>
                              <p className="text-gray-600 dark:text-gray-300 mt-1">
                                {item.metadata.description}
                              </p>

                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                  {item.metadata.lastUpdated && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      <span>Updated {item.metadata.lastUpdated}</span>
                                    </div>
                                  )}

                                  {item.metadata.author && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-4 w-4" />
                                      <span>By {item.metadata.author}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                          </div>
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Quick Links
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Link
              to="/documentation/overview"
              className="flex items-center gap-3 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
            >
              <Book className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100">System Overview</span>
            </Link>

            <Link
              to="/documentation/reference"
              className="flex items-center gap-3 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
            >
              <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100">Quick Reference</span>
            </Link>

            <Link
              to="/documentation/troubleshooting"
              className="flex items-center gap-3 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
            >
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100">Troubleshooting</span>
            </Link>
          </div>
        </div>
      </div>
    </DocumentationLayout>
  );
};
