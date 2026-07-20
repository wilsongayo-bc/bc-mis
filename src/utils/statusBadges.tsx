// Dweezil's Code - Shared status badge utilities for consistent display across the application
import React from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle, UserCheck } from 'lucide-react';

// Enrollment status badge
export const getEnrollmentStatusBadge = (status: string) => {
  const statusClasses = {
    PENDING: {
      bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      icon: Clock,
      label: 'Pending'
    },
    VERIFIED: {
      bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      icon: UserCheck,
      label: 'Verified'
    },
    ENROLLED: {
      bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      icon: CheckCircle,
      label: 'Enrolled'
    },
    COMPLETED: {
      bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      icon: CheckCircle,
      label: 'Completed'
    },
    DROPPED: {
      bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      icon: XCircle,
      label: 'Dropped'
    },
    FAILED: {
      bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      icon: XCircle,
      label: 'Failed'
    }
  };

  const config = statusClasses[status as keyof typeof statusClasses] || {
    bg: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    icon: AlertCircle,
    label: status
  };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
};

// Student registration status badge
export const getRegistrationStatusBadge = (registrationStatus: string) => {
  const statusClasses = {
    PRE_REGISTERED: {
      bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      icon: Clock,
      label: 'Pre-Registered'
    },
    REGISTERED: {
      bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      icon: CheckCircle,
      label: 'Registered'
    },
    WITHDRAWN: {
      bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      icon: XCircle,
      label: 'Withdrawn'
    }
  };

  const config = statusClasses[registrationStatus as keyof typeof statusClasses] || {
    bg: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    icon: AlertCircle,
    label: registrationStatus
  };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
};

// Student status badge (ENROLLED/PRE_REGISTERED)
export const getStudentStatusBadge = (status: string | undefined | null) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
        <Clock className="w-3 h-3 mr-1" />
        Unknown
      </span>
    );
  }

  const statusConfig = {
    ENROLLED: {
      bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      icon: CheckCircle,
      label: 'Enrolled'
    },
    PRE_REGISTERED: {
      bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      icon: Clock,
      label: 'Not Enrolled'
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PRE_REGISTERED;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
};
