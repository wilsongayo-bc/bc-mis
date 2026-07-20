import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, FileText, AlertCircle, Plus, X } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

interface ValidationRules {
  allowedFileTypes?: string[];
  maxFileSize?: number;
  requiresVerification?: boolean;
  customValidation?: Record<string, unknown>;
}

interface FormData {
  name: string;
  description: string;
  isRequired: boolean;
  categoryId: string;
  validationRules: ValidationRules;
  expirationDays?: number;
}

interface FormErrors {
  name?: string;
  description?: string;
  categoryId?: string;
  validationRules?: string;
  expirationDays?: string;
}

const BYTES_PER_MB = 1024 * 1024;

const formatMegabytesForInput = (bytes?: number): string => {
  if (!bytes || bytes <= 0) {
    return '';
  }

  const megabytes = bytes / BYTES_PER_MB;
  return Number.isInteger(megabytes) ? String(megabytes) : String(Number(megabytes.toFixed(2)));
};

const parseMegabytesToBytes = (megabytes: string): number | undefined => {
  if (!megabytes.trim()) {
    return undefined;
  }

  const parsed = Number.parseFloat(megabytes);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.round(parsed * BYTES_PER_MB);
};

const DocumentRequirementForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    isRequired: true,
    categoryId: '',
    validationRules: {},
    expirationDays: undefined
  });

  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState('');



  // Common file types
  const commonFileTypes = [
    'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'
  ];

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/document-categories?limit=100&isActive=true');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  }, []);

  const fetchDocumentRequirement = useCallback(async (requirementId: string) => {
    try {
      setIsLoading(true);
      const response = await api.get(`/document-requirements/${requirementId}`);
      if (response.data.success) {
        const requirement = response.data.data;
        setMaxFileSizeMb(formatMegabytesForInput(requirement.validationRules?.maxFileSize));
        setFormData({
          name: requirement.name,
          description: requirement.description || '',
          isRequired: requirement.isRequired,
          categoryId: requirement.categoryId || '',
          validationRules: requirement.validationRules || {},
          expirationDays: requirement.expirationDays
        });
      }
    } catch (error) {
      console.error('Error fetching document requirement:', error);
      toast.error('Failed to load document requirement');
      navigate('/document-requirements');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCategories();
    if (isEditing && id) {
      fetchDocumentRequirement(id);
    }
  }, [id, isEditing, fetchCategories, fetchDocumentRequirement]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (formData.expirationDays !== undefined && formData.expirationDays < 1) {
      newErrors.expirationDays = 'Expiration days must be at least 1';
    }

    if (maxFileSizeMb.trim()) {
      const parsedMaxFileSizeMb = Number.parseFloat(maxFileSizeMb);
      if (Number.isNaN(parsedMaxFileSizeMb) || parsedMaxFileSizeMb < 1) {
        newErrors.validationRules = 'Max file size must be at least 1 MB';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const validationRules = { ...formData.validationRules };
      const maxFileSizeBytes = parseMegabytesToBytes(maxFileSizeMb);
      if (maxFileSizeBytes !== undefined) {
        validationRules.maxFileSize = maxFileSizeBytes;
      } else {
        delete validationRules.maxFileSize;
      }

      const submitData = {
        ...formData,
        validationRules: Object.keys(validationRules).length > 0 ? validationRules : undefined,
        expirationDays: formData.expirationDays || undefined
      };

      if (isEditing) {
        await api.put(`/document-requirements/${id}`, submitData);
        toast.success('Document requirement updated successfully');
      } else {
        await api.post('/document-requirements', submitData);
        toast.success('Document requirement created successfully');
      }

      navigate('/document-requirements');
    } catch (error: unknown) {
      console.error('Error saving document requirement:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save document requirement';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean | ValidationRules | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleValidationRuleChange = (field: keyof ValidationRules, value: string[] | number | boolean | Record<string, unknown>) => {
    setFormData(prev => ({
      ...prev,
      validationRules: { ...prev.validationRules, [field]: value }
    }));
  };

  const addFileType = (fileType: string) => {
    if (!formData.validationRules.allowedFileTypes) {
      handleValidationRuleChange('allowedFileTypes', [fileType]);
    } else if (!formData.validationRules.allowedFileTypes.includes(fileType)) {
      handleValidationRuleChange('allowedFileTypes', [...formData.validationRules.allowedFileTypes, fileType]);
    }
  };

  const removeFileType = (fileType: string) => {
    if (formData.validationRules.allowedFileTypes) {
      handleValidationRuleChange(
        'allowedFileTypes',
        formData.validationRules.allowedFileTypes.filter(type => type !== fileType)
      );
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/document-requirements')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Document Requirements
          </button>
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Document Requirement' : 'Add Document Requirement'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {isEditing ? 'Update the document requirement details' : 'Create a new document requirement for students'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter requirement name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  id="categoryId"
                  value={formData.categoryId}
                  onChange={(e) => handleInputChange('categoryId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.categoryId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.categoryId}
                  </p>
                )}
              </div>

              {/* Required Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Required Status
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="isRequired"
                      checked={formData.isRequired}
                      onChange={() => handleInputChange('isRequired', true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Required</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="isRequired"
                      checked={!formData.isRequired}
                      onChange={() => handleInputChange('isRequired', false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Optional</span>
                  </label>
                </div>
              </div>

              {/* Expiration Days */}
              <div>
                <label htmlFor="expirationDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expiration Days
                </label>
                <input
                  type="number"
                  id="expirationDays"
                  value={formData.expirationDays || ''}
                  onChange={(e) => handleInputChange('expirationDays', e.target.value ? parseInt(e.target.value) : undefined)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.expirationDays ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Days until document expires"
                  min="1"
                />
                {errors.expirationDays && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.expirationDays}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter requirement description"
                />
              </div>
            </div>
          </div>



          {/* Validation Rules */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Validation Rules</h2>
            
            <div className="space-y-6">
              {/* Max File Size */}
              <div>
                <label htmlFor="maxFileSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum File Size (MB)
                </label>
                <input
                  type="number"
                  id="maxFileSize"
                  value={maxFileSizeMb}
                  onChange={(e) => {
                    setMaxFileSizeMb(e.target.value);
                    if (errors.validationRules) {
                      setErrors(prev => ({ ...prev, validationRules: undefined }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Maximum file size in MB"
                  min="1"
                  step="0.5"
                />
                {errors.validationRules && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.validationRules}
                  </p>
                )}
              </div>

              {/* Allowed File Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Allowed File Types
                </label>
                <div className="space-y-3">
                  {/* Common file types */}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Common file types:</p>
                    <div className="flex flex-wrap gap-2">
                      {commonFileTypes.map((fileType) => (
                        <button
                          key={fileType}
                          type="button"
                          onClick={() => addFileType(fileType)}
                          disabled={formData.validationRules.allowedFileTypes?.includes(fileType)}
                          className={`px-3 py-1 text-sm rounded-md border ${
                            formData.validationRules.allowedFileTypes?.includes(fileType)
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                              : 'bg-white text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Plus className="h-3 w-3 inline mr-1" />
                          {fileType}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected file types */}
                  {formData.validationRules.allowedFileTypes && formData.validationRules.allowedFileTypes.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selected file types:</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.validationRules.allowedFileTypes.map((fileType) => (
                          <span
                            key={fileType}
                            className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md"
                          >
                            {fileType}
                            <button
                              type="button"
                              onClick={() => removeFileType(fileType)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Requires Verification */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.validationRules.requiresVerification || false}
                    onChange={(e) => handleValidationRuleChange('requiresVerification', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Requires manual verification</span>
                </label>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  When enabled, submitted documents will require manual approval by staff.
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/document-requirements')}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update Requirement' : 'Create Requirement'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentRequirementForm;
