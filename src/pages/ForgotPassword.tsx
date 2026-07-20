import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'sonner';
import { useSettingsContext } from '../utils/settingsUtils';

const ForgotPassword: React.FC = () => {
  const { theme } = useSettingsContext();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast.error('Email is required');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/password-reset/request', { email: normalizedEmail });
      setSubmitted(true);
      toast.success('If your email is verified, you will receive a password reset email shortly.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to request password reset');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`w-full max-w-md rounded-lg shadow-sm p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Forgot Password</h1>
        <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          Enter your verified email address. If it matches an active account, you will receive a reset code and link.
        </p>

        {submitted ? (
          <div className="mt-6 space-y-4">
            <div className={`rounded-md px-4 py-3 text-sm ${theme === 'dark' ? 'bg-green-900/20 text-green-200' : 'bg-green-50 text-green-700'}`}>
              Request sent. Check your inbox for the reset code and link.
            </div>
            <div className="flex gap-3">
              <Link
                to="/login"
                className={`flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${theme === 'dark'
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                Back to Login
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
                className={`flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md border text-sm font-medium ${theme === 'dark'
                  ? 'border-gray-600 text-gray-200 hover:bg-gray-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Send Again
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark'
                  ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                  : 'border-gray-300 bg-white text-gray-900'
                  }`}
                placeholder="name@domain.com"
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending...' : 'Send Reset Email'}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className={`text-sm ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;

