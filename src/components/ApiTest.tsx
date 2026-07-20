import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../lib/api';

interface ApiResult {
  status: number;
  data: unknown;
  headers?: unknown;
  ok?: boolean;
}

const ApiTest: React.FC = () => {
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const auth = useSelector((state: RootState) => state.auth);
  const token = localStorage.getItem('token');

  const testUsersAPI = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log('🔍 Testing /api/users endpoint...');
      console.log('🔑 Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'No token');
      console.log('🏪 Redux auth state:', auth);
      
      const response = await api.get('/users');
      console.log('✅ API Response:', response.data);
      
      setResult({
        status: response.status,
        data: response.data,
        headers: response.headers
      });
    } catch (err: unknown) {
      console.error('❌ API Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const testDirectFetch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log('🔍 Testing axios to /users...');
      const response = await api.get('/users');
      console.log('✅ Axios response:', { status: response.status, data: response.data });
      setResult({ status: response.status, data: response.data, ok: true });
    } catch (err: unknown) {
      console.error('❌ Direct fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">API Test Component</h3>
      
      <div className="mb-4">
        <h4 className="font-medium mb-2">Authentication Status:</h4>
        <div className="text-sm space-y-1">
          <div>Token in localStorage: {token ? '✅ Present' : '❌ Missing'}</div>
          <div>Redux isAuthenticated: {auth.isAuthenticated ? '✅ True' : '❌ False'}</div>
          <div>Redux user: {auth.user ? `✅ ${auth.user.email}` : '❌ No user'}</div>
          <div>Redux role: {auth.user?.role || 'No role'}</div>
        </div>
      </div>
      
      <div className="space-x-2 mb-4">
        <button 
          onClick={testUsersAPI}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Users API (axios)'}
        </button>
        
        <button 
          onClick={testDirectFetch}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Direct Fetch'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {result && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded">
          <strong>Result:</strong>
          <pre className="mt-2 text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApiTest;