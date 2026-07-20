/**
 * Error handling utilities for user management
 */

import { toast } from 'sonner';
import type { ValidationError } from './validation';

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: unknown;
  statusCode?: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Parse API error response
 */
export const parseApiError = (error: unknown): ApiError => {
  // Handle network errors
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return {
      message: 'Network error. Please check your connection and try again.',
      code: 'NETWORK_ERROR'
    };
  }

  const errorResponse = error.response as { status: number; data?: unknown };
  const { status, data } = errorResponse;

  // Handle different HTTP status codes
  switch (status) {
    case 400:
      return {
        message: (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') ? data.message : 'Invalid request. Please check your input.',
        statusCode: 400,
        details: (data && typeof data === 'object' && 'details' in data) ? data.details : undefined
      };
    case 401:
      return {
        message: 'You are not authorized to perform this action.',
        code: 'UNAUTHORIZED'
      };
    case 403:
      return {
        message: 'You do not have permission to perform this action.',
        code: 'FORBIDDEN'
      };
    case 404:
      return {
        message: 'The requested resource was not found.',
        code: 'NOT_FOUND'
      };
    case 409:
      return {
        message: (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') ? data.message : 'A conflict occurred. This resource may already exist.',
        statusCode: 409
      };
    case 422:
      return {
        message: (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') ? data.message : 'Validation failed. Please check your input.',
        statusCode: 422,
        details: (data && typeof data === 'object' && 'details' in data) ? data.details : undefined
      };
    case 429:
      return {
        message: 'Too many requests. Please wait a moment and try again.',
        code: 'RATE_LIMIT'
      };
    case 500:
      return {
        message: 'An internal server error occurred. Please try again later.',
        code: 'INTERNAL_ERROR'
      };
    default:
      return {
        message: (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') ? data.message : 'An unexpected error occurred.',
        statusCode: status,
        code: 'UNKNOWN_ERROR'
      };
  }
};

/**
 * Handle API errors with toast notifications
 */
export const handleApiError = (error: unknown, customMessage?: string): ApiError => {
  const apiError = parseApiError(error);
  const message = customMessage || apiError.message;
  
  toast.error(message);
  
  return apiError;
};

/**
 * Handle success operations with toast notifications
 */
export const handleSuccess = (message: string): void => {
  toast.success(message);
};

/**
 * Handle loading states with toast notifications
 */
export const handleLoading = (message: string | number): string | number => {
  return toast.loading(String(message));
};

/**
 * Show loading toast with string or number message
 */
export const showLoadingToast = (message: string | number): string | number => {
  return toast.loading(String(message));
};

/**
 * Dismiss toast notification
 */
export const dismissToast = (toastId: string): void => {
  toast.dismiss(toastId);
};

/**
 * Handle form validation errors
 */
export const handleValidationErrors = (errors: ValidationError[]): void => {
  if (errors.length > 0) {
    const firstError = errors[0];
    toast.error(firstError.message);
  }
};

/**
 * Handle file upload errors
 */
export const handleFileUploadError = (error: unknown): ApiError => {
  const apiError = parseApiError(error);
  
  // Specific handling for file upload errors
  if (apiError.code === 'BAD_REQUEST' && 
      typeof apiError.details === 'object' && 
      apiError.details !== null && 
      'fileSize' in apiError.details) {
    toast.error('File size is too large. Please choose a smaller file.');
  } else if (apiError.code === 'BAD_REQUEST' && 
             typeof apiError.details === 'object' && 
             apiError.details !== null && 
             'fileType' in apiError.details) {
    toast.error('Invalid file type. Please choose a valid image file.');
  } else {
    toast.error(apiError.message);
  }
  
  return apiError;
};

/**
 * Handle bulk operation errors
 */
export const handleBulkOperationError = (error: unknown, operation: string): ApiError => {
  const apiError = parseApiError(error);
  const message = `Failed to ${operation}. ${apiError.message}`;
  
  toast.error(message);
  
  return apiError;
};

/**
 * Handle import/export errors
 */
export const handleImportExportError = (error: unknown, operation: 'import' | 'export'): ApiError => {
  const apiError = parseApiError(error);
  const message = `Failed to ${operation} users. ${apiError.message}`;
  
  toast.error(message);
  
  return apiError;
};

/**
 * Retry mechanism for failed operations
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
};

/**
 * Validate required fields
 */
export const validateRequiredFields = (data: Record<string, unknown>, requiredFields: string[]): string[] => {
  const missingFields: string[] = [];
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missingFields.push(field);
    }
  });
  
  return missingFields;
};

/**
 * Format error message for display
 */
export const formatErrorMessage = (error: ApiError): string => {
  if (error.details && Array.isArray(error.details)) {
    const detailMessages = error.details.map((detail: unknown) => 
      typeof detail === 'object' && detail !== null && 'message' in detail 
        ? (detail as { message: string }).message 
        : String(detail)
    ).join(', ');
    return `${error.message} Details: ${detailMessages}`;
  }
  
  return error.message;
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: ApiError): boolean => {
  return error.code === 'NETWORK_ERROR';
};

/**
 * Check if error is an authorization error
 */
export const isAuthError = (error: ApiError): boolean => {
  return error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN';
};

/**
 * Check if error is a validation error
 */
export const isValidationError = (error: ApiError): boolean => {
  return error.code === 'VALIDATION_ERROR' || error.code === 'BAD_REQUEST';
};