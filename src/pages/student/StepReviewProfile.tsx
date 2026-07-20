import React, { useState } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { selectUser } from '../../store/slices/authSlice';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CreditCard,
  CheckCircle
} from 'lucide-react';

interface StepReviewProfileProps {
  onNext: () => void;
}

const StepReviewProfile: React.FC<StepReviewProfileProps> = ({ onNext }) => {
  const user = useAppSelector(selectUser);
  const [confirmed, setConfirmed] = useState(false);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Verify Your Information
        </h3>
        <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
          Please review your personal details below. If any information is incorrect, please contact the Registrar's Office before proceeding.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Personal Information
          </h3>
        </div>
        <div className="px-6 py-5">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Full Name
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-semibold">
                {user.firstName} {user.lastName}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Email Address
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {user.email}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                Student ID
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                {(user as any).studentId || 'N/A'}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Role
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {user.role}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="confirm-info"
          name="confirm-info"
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="confirm-info" className="ml-2 block text-sm text-gray-900 dark:text-white">
          I confirm that the information above is correct and up to date.
        </label>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={!confirmed}
          className="flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Course Selection
          <CheckCircle className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default StepReviewProfile;
