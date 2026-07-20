import { useState, useEffect } from 'react';
import { fetchPasswordRequirements } from '../services/settingsService';

interface PasswordRequirements {
  minLength: number;
  requireSpecialChars: boolean;
  message: string;
}

/**
 * Hook to fetch and manage password requirements from settings
 */
export const usePasswordRequirements = () => {
  const [requirements, setRequirements] = useState<PasswordRequirements>({
    minLength: 8,
    requireSpecialChars: true,
    message: 'Password must be at least 8 characters and contain at least one special character (!@#$%^&*)'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRequirements = async () => {
      try {
        const reqs = await fetchPasswordRequirements();
        setRequirements(reqs);
      } catch (error) {
        console.error('Failed to load password requirements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRequirements();
  }, []);

  /**
   * Validate password against current requirements
   */
  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (!password) {
      return { valid: false, message: 'Password is required' };
    }

    if (password.length < requirements.minLength) {
      return {
        valid: false,
        message: `Password must be at least ${requirements.minLength} characters long`
      };
    }

    if (requirements.requireSpecialChars) {
      const specialCharsRegex = /[!@#$%^&*(),.?":{}|<>]/;
      if (!specialCharsRegex.test(password)) {
        return {
          valid: false,
          message: 'Password must contain at least one special character (!@#$%^&*)'
        };
      }
    }

    return { valid: true };
  };

  return {
    requirements,
    loading,
    validatePassword
  };
};
