import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Tag, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

interface FormData {
  name: string;
  description: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  description?: string;
  color?: string;
  sortOrder?: string;
}

const DocumentCategoryForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    color: '#3B82F6',
    sortOrder: 0,
    isActive: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch category data if editing
  const fetchDocumentCategory = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const response = await api.get(`/document-categories/${id}`);
      
      if (response.data.success) {
        const category = response.data.data;
        setFormData({
          name: category.name || '',
          description: category.description || '',
          color: category.color || '#3B82F6',
          sortOrder: category.sortOrder || 0,
          isActive: category.isActive ?? true,
        });
      } else {
        toast.error('Failed to fetch category details');
        navigate('/document-categories');
      }
    } catch (error) {
      console.error('Error fetching category:', error);
      toast.error('Failed to fetch category details');
      navigate('/document-categories');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (isEditing) {
      fetchDocumentCategory();
    }
  }, [id, isEditing, fetchDocumentCategory]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Category name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (!formData.color || !/^#[0-9A-F]{6}$/i.test(formData.color)) {
      newErrors.color = 'Please select a valid color';
    }

    if (formData.sortOrder < 0 || formData.sortOrder > 9999) {
      newErrors.sortOrder = 'Sort order must be between 0 and 9999';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      setIsSubmitting(true);

      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
      };

      let response;
      if (isEditing) {
        response = await api.put(`/document-categories/${id}`, submitData);
      } else {
        response = await api.post('/document-categories', submitData);
      }

      if (response.data.success) {
        toast.success(
          isEditing 
            ? 'Document category updated successfully' 
            : 'Document category created successfully'
        );
        navigate('/document-categories');
      } else {
        toast.error(response.data.message || 'Failed to save category');
      }
    } catch (error: unknown) {
      console.error('Error saving category:', error);
      
      const typedError = error as { response?: { data?: { message?: string }; status?: number } };
      if (typedError.response?.data?.message) {
        toast.error(typedError.response.data.message);
      } else if (typedError.response?.status === 409) {
        toast.error('A category with this name already exists');
      } else {
        toast.error('Failed to save category');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading category details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/document-categories')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Categories
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Tag className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Document Category' : 'Create Document Category'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {isEditing 
                  ? 'Update the category information below' 
                  : 'Create a new document category for organizing requirements'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Information</h3>
                
                {/* Category Name */}
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter category name"
                    maxLength={100}
                  />
                  {errors.name && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.name}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter category description (optional)"
                    maxLength={500}
                  />
                  {errors.description && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.description}
                    </div>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formData.description.length}/500 characters
                  </p>
                </div>
              </div>

              {/* Display Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Display Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Color */}
                  <div className="space-y-2">
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Category Color *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="color"
                        value={formData.color}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                        className="h-10 w-16 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.color ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="#3B82F6"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                    {errors.color && (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {errors.color}
                      </div>
                    )}
                  </div>

                  {/* Sort Order */}
                  <div className="space-y-2">
                    <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      id="sortOrder"
                      value={formData.sortOrder}
                      onChange={(e) => handleInputChange('sortOrder', parseInt(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.sortOrder ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="0"
                      max="9999"
                    />
                    {errors.sortOrder && (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {errors.sortOrder}
                      </div>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Lower numbers appear first in lists
                    </p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Status</h3>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active Category
                  </label>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Inactive categories will not be available for new document requirements
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate('/document-categories')}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {isSubmitting 
                  ? (isEditing ? 'Updating...' : 'Creating...') 
                  : (isEditing ? 'Update Category' : 'Create Category')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DocumentCategoryForm;