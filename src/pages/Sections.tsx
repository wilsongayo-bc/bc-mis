import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, Edit, Trash2, Search, Power, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppDispatch, RootState } from '../store';
import { 
  fetchCourseSections, 
  deleteCourseSection, 
  updateCourseSectionStatus
} from '../store/slices/courseSectionSlice';
import { useSettingsContext } from '../utils/settingsUtils';
import PageSizeDropdown from '../components/PageSizeDropdown';
import { CourseSection } from '../types/courseSection.types';
import { toast } from 'sonner';

const Sections: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useSettingsContext();
  const isDarkMode = theme === 'dark';

  // Redux state
  const { 
    courseSections: sections, 
    isLoading: loading, 
    total, 
    totalPages
  } = useSelector((state: RootState) => state.courseSection);

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [localPage, setLocalPage] = useState(1);
  const [localLimit, setLocalLimit] = useState(10);

  // Fetch sections
  const loadSections = useCallback(() => {
    dispatch(fetchCourseSections({
      page: localPage,
      limit: localLimit,
      search: searchTerm,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }));
  }, [dispatch, localPage, localLimit, searchTerm]);

  useEffect(() => {
    loadSections();
  }, [loadSections]); // Debounce search in real app

  // Handle delete
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete section "${name}"?\n\nThis action cannot be undone and is only allowed for sections with no history.`)) {
      return;
    }

    try {
      await dispatch(deleteCourseSection(id)).unwrap();
      toast.success(`Section "${name}" deleted permanently`);
      loadSections(); // Refresh list
    } catch (error: unknown) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to delete section';
      toast.error(errorMessage);
      console.error('Delete error:', error);
    }
  };

  // Handle page change
  const handleToggleStatus = async (id: string, currentStatus: boolean, name: string) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} section "${name}"?`)) {
      return;
    }

    try {
      await dispatch(updateCourseSectionStatus({ id, isActive: !currentStatus })).unwrap();
      toast.success(`Section "${name}" ${action}d successfully`);
    } catch (error: unknown) {
      const errorMessage = typeof error === 'string' ? error : `Failed to ${action} section`;
      toast.error(errorMessage);
      console.error('Status update error:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    setLocalPage(newPage);
  };

  // Handle limit change
  const handleLimitChange = (newLimit: number) => {
    setLocalLimit(newLimit);
    setLocalPage(1); // Reset to first page
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Sections
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage and organize course sections and class lists
          </p>
        </div>
        <Link
          to="/sections/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search sections by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Section Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Course
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Year Level
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-500 dark:text-gray-400">Loading sections...</span>
                    </div>
                  </td>
                </tr>
              ) : sections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">No sections found</h3>
                    <p className="mt-1">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                sections.map((section: CourseSection) => (
                  <tr key={section.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {section.sectionName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">{section.course?.courseCode}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{section.course?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {section.yearLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        section.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {section.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/settings/sections/${section.id}/edit`}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(section.id, section.isActive, section.sectionName)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            section.isActive 
                              ? 'text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30' 
                              : 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30'
                          }`}
                          title={section.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(section.id, section.sectionName)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{Math.min((localPage - 1) * localLimit + 1, total)}</span> to{' '}
                  <span className="font-medium">{Math.min(localPage * localLimit, total)}</span> of{' '}
                  <span className="font-medium">{total}</span> results
                </p>
                <PageSizeDropdown 
                  value={localLimit} 
                  onChange={handleLimitChange} 
                />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(localPage - 1)}
                  disabled={localPage === 1}
                  className={`p-2 rounded-md border transition-colors ${
                    localPage === 1
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {localPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(localPage + 1)}
                  disabled={localPage === totalPages}
                  className={`p-2 rounded-md border transition-colors ${
                    localPage === totalPages
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sections;
