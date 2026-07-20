// Dweezil's Code - Professional status messages for students (Issue #6)
import React from 'react';
import { AlertCircle, CheckCircle, Clock, FileText, XCircle } from 'lucide-react';

interface StudentStatusMessageProps {
  status: string;
  context: 'courses' | 'enrollments' | 'schedules';
  hasEnrollment?: boolean; // Dweezil's Code - Track if student has submitted enrollment
}

const StudentStatusMessage: React.FC<StudentStatusMessageProps> = ({ status, context, hasEnrollment = false }) => {
  const getStatusMessage = () => {
    switch (status) {
      case 'PRE_REGISTERED':
        if (context === 'courses') {
          return {
            icon: <Clock className="h-5 w-5" />,
            color: 'blue',
            title: 'Registration In Progress',
            message: 'Your registration is currently being processed by the Registrar\'s Office. Course selection will be available once your registration has been approved.'
          };
        }
        if (context === 'enrollments') {
          return {
            icon: <Clock className="h-5 w-5" />,
            color: 'blue',
            title: 'Registration In Progress',
            message: 'Your registration is currently being processed by the Registrar\'s Office. Enrollment information will be available once your registration has been approved and you have selected your courses.'
          };
        }
        if (context === 'schedules') {
          return {
            icon: <Clock className="h-5 w-5" />,
            color: 'blue',
            title: 'Registration In Progress',
            message: 'Your registration is currently being processed by the Registrar\'s Office. Your class schedule will be available after your registration has been approved and enrollment is complete.'
          };
        }
        return {
          icon: <Clock className="h-5 w-5" />,
          color: 'blue',
          title: 'Registration In Progress',
          message: 'Your registration is currently being processed by the Registrar\'s Office. You will be notified once your registration has been approved and you can proceed with course selection.'
        };
      
      case 'REGISTERED':
        if (context === 'courses') {
          return {
            icon: <FileText className="h-5 w-5" />,
            color: 'green',
            title: 'Ready for Course Selection',
            message: 'Your registration is complete. You may now select your course section and subjects to start enrollment.'
          };
        }
        if (context === 'enrollments') {
          if (hasEnrollment) {
            return null;
          }
          return {
            icon: <FileText className="h-5 w-5" />,
            color: 'blue',
            title: 'Ready to Enroll',
            message: 'Your registration is complete. Start your enrollment to submit your selected section and subjects.'
          };
        }
        if (context === 'schedules') {
          return {
            icon: <Clock className="h-5 w-5" />,
            color: 'blue',
            title: 'Schedule Not Available',
            message: 'Your class schedule becomes available after your enrollment is marked ENROLLED for scheduling.'
          };
        }
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          color: 'green',
          title: 'Registration Complete',
          message: 'Your registration is complete. You may proceed with enrollment.'
        };
      
      case 'ENROLLMENT_SUBMITTED':
        return {
          icon: <Clock className="h-5 w-5" />,
          color: 'yellow',
          title: 'Enrollment Submitted',
          message: 'Your course selection has been submitted successfully and is currently in PENDING status while the Registrar processes it.'
        };
      
      case 'ENROLLMENT_VERIFIED':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          color: 'blue',
          title: 'Enrollment Verified',
          message: 'Your enrollment has been reviewed by the Registrar\'s Office and is being prepared for scheduling.'
        };
      
      case 'ENROLLMENT_ENROLLED':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          color: 'green',
          title: 'Enrollment Complete',
          message: 'Congratulations! Your enrollment has been completed successfully. Your class schedule is being prepared and will be available soon. You can check your schedule in the "My Schedule" section.'
        };
      
      case 'WITHDRAWN':
        return {
          icon: <XCircle className="h-5 w-5" />,
          color: 'gray',
          title: 'Withdrawn',
          message: 'Your registration has been marked as withdrawn. Please contact the Registrar\'s Office if you need assistance.'
        };
      
      default:
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          color: 'gray',
          title: 'Status Update',
          message: 'For assistance with your registration status, please contact the Registrar\'s Office.'
        };
    }
  };

  const statusInfo = getStatusMessage();

  // If enrolled or no message, don't render anything
  if (!statusInfo) {
    return null;
  }

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-900 dark:text-blue-100',
      text: 'text-blue-800 dark:text-blue-200'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      title: 'text-green-900 dark:text-green-100',
      text: 'text-green-800 dark:text-green-200'
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      title: 'text-yellow-900 dark:text-yellow-100',
      text: 'text-yellow-800 dark:text-yellow-200'
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
      icon: 'text-gray-600 dark:text-gray-400',
      title: 'text-gray-900 dark:text-gray-100',
      text: 'text-gray-800 dark:text-gray-200'
    }
  };

  const colors = colorClasses[statusInfo.color as keyof typeof colorClasses];

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-6 mb-6`}>
      <div className="flex items-start space-x-4">
        <div className={`flex-shrink-0 ${colors.icon}`}>
          {statusInfo.icon}
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${colors.title} mb-2`}>
            {statusInfo.title}
          </h3>
          <p className={`${colors.text} leading-relaxed`}>
            {statusInfo.message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentStatusMessage;
