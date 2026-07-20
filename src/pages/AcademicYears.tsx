import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, X, Calendar, AlertCircle, Home, ChevronRight, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAcademicYear } from '../hooks/useAcademicYear';
import { useAppSelector } from '../hooks/redux';
import { selectAuth } from '../store/slices/authSlice';

interface AcademicYearFormData {
  year: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface AcademicYear {
  id: number;
  year: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

const AcademicYears: React.FC = () => {
  const { token } = useAppSelector(selectAuth);
  const {
    academicYears,
    loading,
    error,
    fetchAllAcademicYears,
    createAcademicYear,
    updateAcademicYearDetails,
    deleteAcademicYear,
    setCurrentAcademicYear
  } = useAcademicYear();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AcademicYearFormData>({
    year: '',
    description: '',
    startDate: '',
    endDate: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<AcademicYearFormData>>({});
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);

  useEffect(() => {
    if (token) {
      fetchAllAcademicYears();
    }
  }, [token, fetchAllAcademicYears]);

  const validateYear = (year: string): boolean => {
    const yearPattern = /^\d{4}-\d{4}$/;
    if (!yearPattern.test(year)) return false;
    
    const [startYear, endYear] = year.split('-').map(Number);
    return endYear === startYear + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: Partial<AcademicYearFormData> = {};
    
    if (!formData.year.trim()) {
      errors.year = 'Academic year is required';
    } else if (!validateYear(formData.year)) {
      errors.year = 'Invalid format. Use YYYY-YYYY (e.g., 2024-2025)';
    } else if (academicYears.some(ay => ay.year === formData.year && ay.id !== Number(editingId))) {
      errors.year = 'This academic year already exists';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }

    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      setActionLoading('create');
      try {
        let success;
        
        if (editingId) {
          success = await updateAcademicYearDetails(
            Number(editingId),
            formData.year,
            formData.description,
            formData.startDate || undefined,
            formData.endDate || undefined
          );
        } else {
          success = await createAcademicYear(
            formData.year, 
            formData.description,
            formData.startDate || undefined,
            formData.endDate || undefined
          );
        }

        if (success) {
          setFormData({ year: '', description: '', startDate: '', endDate: '' });
          setShowAddForm(false);
          setEditingId(null);
        }
      } catch (error) {
        console.error(`Failed to ${editingId ? 'update' : 'create'} academic year:`, error);
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleEdit = (academicYear: AcademicYear) => {
    setEditingId(String(academicYear.id));
    setFormData({
      year: academicYear.year,
      description: academicYear.description || '',
      startDate: academicYear.startDate ? academicYear.startDate.split('T')[0] : '',
      endDate: academicYear.endDate ? academicYear.endDate.split('T')[0] : ''
    });
    setShowAddForm(true);
    setFormErrors({});
  };

  const handleSetCurrent = async (yearId: number, _year: string) => {
    setActionLoading(yearId);
    try {
      await setCurrentAcademicYear(yearId);
    } catch (error) {
      console.error('Failed to set current academic year:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (yearId: number) => {
    if (!confirm('Are you sure you want to delete this academic year?')) return;
    
    setActionLoading(yearId);
    try {
      await deleteAcademicYear(yearId);
    } catch (error) {
      console.error('Failed to delete academic year:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const resetForm = () => {
    setFormData({ year: '', description: '', startDate: '', endDate: '' });
    setFormErrors({});
    setShowAddForm(false);
    setEditingId(null);
  };

  if (loading && academicYears.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="p-6 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500 dark:text-gray-400">Loading academic years...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
            <Link to="/dashboard" className="flex items-center hover:text-gray-900 dark:hover:text-white transition-colors">
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/settings" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Settings
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 dark:text-white font-medium">Academic Years</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Calendar className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            Academic Year Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage academic years for your institution. Set the current academic year and create new ones as needed.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm}
          className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Academic Year
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                <p className="text-sm text-red-700 dark:text-red-300">Error: {error}</p>
              </div>
            </div>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-600">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingId ? 'Edit Academic Year' : 'Add New Academic Year'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                      Academic Year *
                    </label>
                    <input
                      type="text"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      placeholder="e.g., 2024-2025"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-600 dark:text-white transition-all duration-200 ${
                        formErrors.year 
                          ? 'border-red-300 dark:border-red-600' 
                          : 'border-gray-300 dark:border-gray-600 dark:border-gray-500'
                      }`}
                    />
                    {formErrors.year && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{formErrors.year}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., Academic Year 2024-2025"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-600 dark:text-white transition-all duration-200 ${
                        formErrors.description 
                          ? 'border-red-300 dark:border-red-600' 
                          : 'border-gray-300 dark:border-gray-600 dark:border-gray-500'
                      }`}
                    />
                    {formErrors.description && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{formErrors.description}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-600 dark:text-white transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-600 dark:text-white transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={actionLoading === 'create'}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    {actionLoading === 'create' ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update' : 'Create')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Academic Years List */}
          <div className="space-y-3">
            {academicYears.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 dark:text-gray-400">
                No academic years found. Add your first academic year to get started.
              </div>
            ) : (
              academicYears.map((academicYear) => (
                <div
                  key={academicYear.id}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    academicYear.isActive
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-700 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {academicYear.year}
                        </h3>
                        {academicYear.isActive && (
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 text-xs font-medium rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      {academicYear.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">
                          {academicYear.description}
                        </p>
                      )}
                      {(academicYear.startDate || academicYear.endDate) && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {academicYear.startDate ? new Date(academicYear.startDate).toLocaleDateString() : 'N/A'} - {academicYear.endDate ? new Date(academicYear.endDate).toLocaleDateString() : 'N/A'}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                        Created: {new Date(academicYear.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!academicYear.isActive && (
                        <button
                          onClick={() => handleSetCurrent(academicYear.id, academicYear.year)}
                          disabled={actionLoading === academicYear.id}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm rounded transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          {actionLoading === academicYear.id ? 'Setting...' : 'Set Current'}
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(academicYear)}
                        disabled={actionLoading === academicYear.id}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm rounded transition-colors"
                        title="Edit academic year"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(academicYear.id)}
                        disabled={academicYear.isActive || actionLoading === academicYear.id}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm rounded transition-colors"
                        title={academicYear.isActive ? 'Cannot delete the current academic year' : 'Delete academic year'}
                      >
                        <Trash2 className="h-3 w-3" />
                        {actionLoading === academicYear.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Academic Year Guidelines
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Academic years must follow the YYYY-YYYY format (e.g., 2024-2025)</li>
              <li>• The end year must be exactly one year after the start year</li>
              <li>• Only one academic year can be set as current at a time</li>
              <li>• The current academic year cannot be deleted</li>
              <li>• Academic years are used throughout the system for enrollment, scheduling, and reporting</li>
            </ul>
          </div>
      </div>
    </div>
  );
};

export default AcademicYears;