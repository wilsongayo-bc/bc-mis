import api from '../lib/api';
import type { User as AuthSliceUser } from '../store/slices/authSlice';

export interface TwoFactorSetupData {
  email: string;
}

export interface TwoFactorSetupResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
  };
}

export interface TwoFactorStatusResponse {
  success: boolean;
  data: {
    enabled: boolean;
    globallyEnabled: boolean;
    email?: string;
  };
}

export interface TwoFactorVerifyResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: AuthSliceUser;
  };
}

export interface SendCodeResponse {
  success: boolean;
  message: string;
  data: {
    expiresIn: number;
  };
}

/**
 * Setup 2FA for the current user
 */
export const setup2FA = async (token: string, setupData: TwoFactorSetupData): Promise<TwoFactorSetupResponse> => {
  const response = await api.post('/2fa/setup', setupData, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

/**
 * Send verification code via Email
 */
export const sendVerificationCode = async (userId: string): Promise<SendCodeResponse> => {
  const response = await api.post('/2fa/send-code', {
    userId
  });
  return response.data;
};

/**
 * Verify 2FA code
 */
export const verify2FA = async (userId: string, code: string): Promise<TwoFactorVerifyResponse> => {
  const response = await api.post('/2fa/verify', {
    userId,
    code
  });
  return response.data;
};

/**
 * Disable 2FA
 */
export const disable2FA = async (token: string, password: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/2fa/disable', {
    password
  }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

/**
 * Get 2FA status for current user
 */
export const get2FAStatus = async (token: string): Promise<TwoFactorStatusResponse> => {
  const response = await api.get('/2fa/status', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};
