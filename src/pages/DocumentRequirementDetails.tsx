import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  FileText,
  Calendar,
  Tag,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Shield,
  HardDrive,
  FileType
} from 'lucide-react';
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

interface DocumentRequirement {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
  categoryId?: string;
  category?: DocumentCategory;
  validationRules?: ValidationRules;
  expirationDays?: number;
  createdBy?: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

const DocumentRequirementDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState<DocumentRequirement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocumentRequirement = useCallback(async (requirementId: string) => {
    try {
      setIsLoading(true);
      const response = await api.get(`/document-requirements/${requirementId}`);
      if (response.data.success) {
        setRequirement(response.data.data);
      } else {
        toast.error('Document requirement not found');
        navigate('/document-requirements');
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
    if (id) {
      fetchDocumentRequirement(id);
    }
  }, [id, fetchDocumentRequirement]);



  const formatFileSize = (sizeInMB: number) => {
    if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
    return `${sizeInMB} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Document Requirement Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The document requirement you're looking for doesn't exist.</p>
          <Link
            to="/document-requirements"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Document Requirements
          </Link>
        </div>
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
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{requirement.name}</h1>
                <div className="flex items-center mt-2 space-x-4">
                  {requirement.isRequired ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Required
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      Optional
                    </span>
                  )}
                  
                  {requirement.category && (
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: requirement.category.color }}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {requirement.category.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Link
                to={`/document-requirements/${requirement.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>

            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {requirement.description && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Description</h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{requirement.description}</p>
              </div>
            )}



            {/* Validation Rules */}
            {requirement.validationRules && Object.keys(requirement.validationRules).length > 0 && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Validation Rules
                </h2>
                
                <div className="space-y-4">
                  {/* Max File Size */}
                  {requirement.validationRules.maxFileSize && (
                    <div className="flex items-center">
                      <HardDrive className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Maximum File Size</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatFileSize(requirement.validationRules.maxFileSize)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Allowed File Types */}
                  {requirement.validationRules.allowedFileTypes && requirement.validationRules.allowedFileTypes.length > 0 && (
                    <div className="flex items-start">
                      <FileType className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Allowed File Types</p>
                        <div className="flex flex-wrap gap-1">
                          {requirement.validationRules.allowedFileTypes.map((fileType) => (
                            <span
                              key={fileType}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800"
                            >
                              .{fileType}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Requires Verification */}
                  {requirement.validationRules.requiresVerification && (
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Manual Verification Required</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Submitted documents require manual approval by staff
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Info</h2>
              
              <div className="space-y-4">
                {/* Status */}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                  <div className="mt-1">
                    {requirement.isRequired ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Optional
                      </span>
                    )}
                  </div>
                </div>

                {/* Category */}
                {requirement.category && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</p>
                    <div className="mt-1">
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: requirement.category.color }}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {requirement.category.name}
                      </span>
                    </div>
                  </div>
                )}

                {/* Expiration */}
                {requirement.expirationDays && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Document Expiration</p>
                    <div className="mt-1 flex items-center text-sm text-gray-900 dark:text-white">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      {requirement.expirationDays} days
                    </div>
                  </div>
                )}

                {/* Created By */}
                {requirement.creator && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created By</p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {requirement.creator.firstName} {requirement.creator.lastName}
                    </p>
                  </div>
                )}

                {/* Created Date */}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</p>
                  <div className="mt-1 flex items-center text-sm text-gray-900 dark:text-white">
                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                    {formatDate(requirement.createdAt)}
                  </div>
                </div>

                {/* Last Updated */}
                {requirement.updatedAt !== requirement.createdAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</p>
                    <div className="mt-1 flex items-center text-sm text-gray-900 dark:text-white">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      {formatDate(requirement.updatedAt)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Actions</h2>
              
              <div className="space-y-3">
                <Link
                  to={`/document-requirements/${requirement.id}/edit`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Requirement
                </Link>
                

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentRequirementDetails;