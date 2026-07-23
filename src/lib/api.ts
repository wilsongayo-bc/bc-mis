import axios from 'axios';

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, '');

export const resolveApiBaseUrl = (): string => {
  const rawFromEnv = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  const raw = rawFromEnv ? normalizeBaseUrl(rawFromEnv) : '';

  const isUatHostname = () => {
    try {
      return typeof window !== 'undefined' && /(^|[-.])uat([-.]|$)/i.test(window.location.hostname);
    } catch {
      return false;
    }
  };

  const defaultProdBase = isUatHostname()
    ? 'https://api-uat.benedictcollege.com/api'
    : 'https://api.benedictcollege.com/api';

  if (raw) {
    if (import.meta.env.PROD && (raw === '/api' || raw === 'api')) {
      return defaultProdBase;
    }

    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        const path = url.pathname.replace(/\/+$/, '');
        const isSameOrigin =
          import.meta.env.PROD && typeof window !== 'undefined' && url.origin === window.location.origin;
        const isLikelyFrontendHost =
          import.meta.env.PROD && (url.hostname.endsWith('vercel.app') || url.hostname === 'mis.benedictcollege.com');
        const isApiPath = path === '/api' || path.startsWith('/api/');

        if (isLikelyFrontendHost && isApiPath) {
          return defaultProdBase;
        }
        if (path === '' || path === '/') {
          url.pathname = '/api';
          return isSameOrigin ? defaultProdBase : normalizeBaseUrl(url.toString());
        }
        if (isSameOrigin && path === '/api') {
          return defaultProdBase;
        }
        return normalizeBaseUrl(url.toString());
      } catch {
        return raw;
      }
    }

    return raw;
  }

  if (import.meta.env.PROD) return defaultProdBase;
  return '/api';
};

export const API_BASE_URL = resolveApiBaseUrl();

export const resolveAssetUrl = (value: string): string => {
  const raw = value?.trim();
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;

  if (raw.startsWith('/uploads/')) {
    if (import.meta.env.PROD && /^https?:\/\//i.test(API_BASE_URL)) {
      try {
        const apiUrl = new URL(API_BASE_URL);
        return `${apiUrl.origin}${raw}`;
      } catch {
        return raw;
      }
    }
  }

  return raw;
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('🔗 Axios baseURL set to:', API_BASE_URL);

// Helper function to determine error type and provide user-friendly messages
const getErrorMessage = (error: unknown): string => {
  // Type guard to check if error has axios error structure
  const isAxiosError = (err: unknown): err is { response?: { status: number; data?: unknown }; code?: string; message?: string } => {
    return typeof err === 'object' && err !== null;
  };

  if (!isAxiosError(error)) {
    return 'An unexpected error occurred.';
  }

  // Network/Connection errors
  if (!error.response) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      return 'Unable to connect to the server. Please ensure the backend server is running on port 3001. Run "npm run server:dev" or "npm run dev" to start the server.';
    }
    if (error.code === 'ENOTFOUND') {
      return 'Server not found. Please check your network connection and server configuration.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. The server may be overloaded or your connection is slow.';
    }
    return 'Network error occurred. Please check your internet connection and try again.';
  }

  // HTTP errors with response
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    const getMessage = (d: unknown): string | undefined => {
      if (d && typeof d === 'object' && 'message' in d) {
        const obj = d as { message: unknown };
        return typeof obj.message === 'string' ? obj.message : undefined;
      }
      return undefined;
    };

    switch (status) {
      case 400:
        return getMessage(data) || 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return 'Access denied. You do not have permission to perform this action.';
      case 404:
        return getMessage(data) || 'The requested resource was not found.';
      case 409:
        return getMessage(data) || 'Conflict detected. The resource may already exist or be in use.';
      case 422:
        return getMessage(data) || 'Invalid data provided. Please check your input.';
      case 500:
        return 'Internal server error. Please try again later or contact support.';
      case 502:
        return 'Bad gateway. The server is temporarily unavailable.';
      case 503:
        return 'Service unavailable. The server is temporarily down for maintenance.';
      default:
        return getMessage(data) || `Server error (${status}). Please try again later.`;
    }
  }

  return 'An unexpected error occurred.';
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const base = (config.baseURL || API_BASE_URL || '').toString();
    const url = (config.url || '').toString();

    if (url && url.startsWith('/') && !url.startsWith('/api')) {
      try {
        const parsed = /^https?:\/\//i.test(base) ? new URL(base) : null;
        const basePath = parsed ? parsed.pathname.replace(/\/+$/, '') : base.replace(/\/+$/, '');
        const baseHasApi = basePath === '/api' || basePath.endsWith('/api');
        if (!baseHasApi) {
          config.url = `/api${url}`;
        }
      } catch {
        void 0;
      }
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // If the data is FormData, remove Content-Type to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if not already on login page to avoid loops
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Enhance error with user-friendly message
    error.message = getErrorMessage(error);
    
    // Log detailed error for debugging (skip error log for 401s as they are expected during session expiry)
    if (error.response?.status !== 401) {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
        originalError: error.response?.data || error.message
      });
    } else {
      console.warn('Authentication required (401), redirecting to login.');
    }
    
    const cfg = error.config as { __retryCount?: number } & import('axios').AxiosRequestConfig;
    const status = error.response?.status;
    const shouldRetry = !error.response || status === 429 || status === 502 || status === 503 || status === 504;
    if (cfg && shouldRetry) {
      cfg.__retryCount = (cfg.__retryCount ?? 0) + 1;
      const maxRetries = 2;
      if (cfg.__retryCount <= maxRetries) {
        const backoff = 500 * Math.pow(2, cfg.__retryCount - 1);
        await delay(backoff);
        return api.request(cfg);
      }
    }
    return Promise.reject(error);
  }
);

// Utility function to check backend connectivity
export const checkBackendConnectivity = async (): Promise<{ connected: boolean; message: string }> => {
  try {
    const response = await api.get('/health');
    if (response.status >= 200 && response.status < 300) {
      return { connected: true, message: 'Backend server is running' };
    }
    return { connected: false, message: `Backend server responded with status ${response.status}` };
  } catch (_error: unknown) {
    return { connected: false, message: 'Backend server is not running. Please start it with "npm run server:dev" or "npm run dev".' };
  }
};

export default api;
