import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'sonner';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Missing verification token');
      return;
    }

    const normalizedCode = code.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/email-verification/verify', { token, code: normalizedCode });
      setVerified(true);
      toast.success('Email verified successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify email');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Verify Email</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Enter the 6-digit code sent to your email address.
        </p>

        {!token && (
          <div className="mt-4 rounded-md bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            Missing verification token. Please use the link from your email.
          </div>
        )}

        {verified ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-700 dark:text-green-200">
              Email verified. You can return to your profile.
            </div>
            <div className="flex gap-3">
              <Link
                to="/profile"
                className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Go to Profile
              </Link>
              <Link
                to="/login"
                className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Login
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="123456"
                maxLength={6}
                disabled={submitting || !token}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !token}
              className="w-full inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;

