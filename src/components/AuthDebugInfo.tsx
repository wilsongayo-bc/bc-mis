import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useLocation } from 'react-router-dom';

interface AuthSnapshot {
  timestamp: string;
  event: string;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasUser: boolean;
  userRole: string | null;
  hasToken: boolean;
}

interface TokenInfo {
  userId?: string;
  email?: string;
  role?: string;
  iat?: string;
  exp?: string;
  isExpired?: boolean;
  error?: string;
}

const AuthDebugInfo: React.FC = () => {
  const { isLoading, isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const [snapshots, setSnapshots] = useState<AuthSnapshot[]>([]);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  // Parse JWT token to get info
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setTokenInfo({
          userId: payload.sub || payload.userId || payload.id,
          email: payload.email,
          role: payload.role,
          iat: new Date(payload.iat * 1000).toLocaleString(),
          exp: new Date(payload.exp * 1000).toLocaleString(),
          isExpired: Date.now() > payload.exp * 1000
        });
      } catch {
        setTokenInfo({ error: 'Invalid token format' });
      }
    } else {
      setTokenInfo(null);
    }
  }, [isAuthenticated]);

  // Track authentication state changes
  useEffect(() => {
    const snapshot: AuthSnapshot = {
      timestamp: new Date().toLocaleString(),
      event: 'State Change',
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      userRole: user?.role || null,
      hasToken: !!localStorage.getItem('token')
    };

    setSnapshots(prev => [...prev.slice(-4), snapshot]); // Keep last 5 snapshots
  }, [isLoading, isAuthenticated, user]);

  const getStatusIcon = (status: boolean) => status ? '✅' : '❌';
  const getLoadingIcon = (loading: boolean) => loading ? '🔄' : '✅';

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        🔍 Authentication Debug Information
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-normal">
          (Super Admin Only)
        </span>
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Authentication State */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2">
            Current Authentication State
          </h4>
          
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <span className="text-gray-700 dark:text-gray-300">Loading:</span>
              <span className="flex items-center text-gray-900 dark:text-white">
                {getLoadingIcon(isLoading)} {isLoading ? 'Loading...' : 'Ready'}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <span className="text-gray-700 dark:text-gray-300">Authenticated:</span>
              <span className="flex items-center text-gray-900 dark:text-white">
                {getStatusIcon(isAuthenticated)} {isAuthenticated ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <span className="text-gray-700 dark:text-gray-300">Has User:</span>
              <span className="flex items-center text-gray-900 dark:text-white">
                {getStatusIcon(!!user)} {user ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <span className="text-gray-700 dark:text-gray-300">User Role:</span>
              <span className={`font-semibold ${
                user?.role === 'SUPERADMIN' ? 'text-red-600 dark:text-red-400' :
                user?.role === 'ADMIN' ? 'text-blue-600 dark:text-blue-400' :
                user?.role === 'TEACHER' ? 'text-green-600 dark:text-green-400' :
                user?.role === 'STUDENT' ? 'text-purple-600 dark:text-purple-400' :
                'text-gray-500 dark:text-gray-400'
              }`}>
                {user?.role || 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <span className="text-gray-700 dark:text-gray-300">Status:</span>
              <span className={`font-semibold ${
                user?.status === 'ACTIVE' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {user?.status || 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <span className="text-gray-700 dark:text-gray-300">Has Token:</span>
              <span className="flex items-center text-gray-900 dark:text-white">
                {getStatusIcon(!!localStorage.getItem('token'))} 
                {localStorage.getItem('token') ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* User Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2">
            User Information
          </h4>
          
          {user ? (
            <div className="space-y-2 font-mono text-sm">
              <div className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                <div className="font-semibold text-gray-700 dark:text-gray-300">ID:</div>
                <div className="text-gray-600 dark:text-gray-400">{user.id}</div>
              </div>
              
              <div className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                <div className="font-semibold text-gray-700 dark:text-gray-300">Email:</div>
                <div className="text-gray-600 dark:text-gray-400">{user.email}</div>
              </div>
              
              <div className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                <div className="font-semibold text-gray-700 dark:text-gray-300">Name:</div>
                <div className="text-gray-600 dark:text-gray-400">{user.firstName} {user.lastName}</div>
              </div>
              
              <div className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                <div className="font-semibold text-gray-700 dark:text-gray-300">Status:</div>
                <div className={`font-semibold ${
                  user.status === 'ACTIVE' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {user.status}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-center text-gray-500 dark:text-gray-400">
              No user data available
            </div>
          )}
        </div>

        {/* Token Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2">
            Token Information
          </h4>
          
          {tokenInfo ? (
            tokenInfo.error ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300">
                Error: {tokenInfo.error}
              </div>
            ) : (
              <div className="space-y-2 font-mono text-sm">
                <div className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">User ID:</div>
                  <div className="text-gray-600 dark:text-gray-400">{tokenInfo.userId || 'N/A'}</div>
                </div>
                
                <div className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">Email:</div>
                  <div className="text-gray-600 dark:text-gray-400">{tokenInfo.email || 'N/A'}</div>
                </div>
                
                <div className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">Role:</div>
                  <div className="text-gray-600 dark:text-gray-400">{tokenInfo.role || 'N/A'}</div>
                </div>
                
                <div className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">Issued At:</div>
                  <div className="text-gray-600 dark:text-gray-400">{tokenInfo.iat || 'N/A'}</div>
                </div>
                
                <div className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">Expires At:</div>
                  <div className={`font-semibold ${
                    tokenInfo.isExpired ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                  }`}>
                    {tokenInfo.exp || 'N/A'} {tokenInfo.isExpired ? '(EXPIRED)' : '(Valid)'}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-center text-gray-500 dark:text-gray-400">
              No token available
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2">
            Recent Authentication Activity
          </h4>
          
          <div className="space-y-2">
            {snapshots.length > 0 ? (
              snapshots.slice(-5).reverse().map((snapshot, index) => (
                <div key={index} className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                      {snapshot.timestamp}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {snapshot.event}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-gray-700 dark:text-gray-300">
                    Auth: {getStatusIcon(snapshot.isAuthenticated)} | 
                    User: {getStatusIcon(snapshot.hasUser)} | 
                    Role: {snapshot.userRole || 'N/A'} | 
                    Token: {getStatusIcon(snapshot.hasToken)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-center text-gray-500 dark:text-gray-400">
                No activity recorded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Route Info */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Current Route Information</h4>
        <div className="font-mono text-sm bg-white dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
          <div><strong>Path:</strong> {location.pathname}</div>
          <div><strong>Search:</strong> {location.search || 'None'}</div>
          <div><strong>Hash:</strong> {location.hash || 'None'}</div>
        </div>
      </div>

      {/* Access Control Check */}
      <div className="mt-4">
        <div className={`p-3 rounded border ${
          isAuthenticated && user && user.role === 'SUPERADMIN'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          <div className="font-semibold mb-1">
            Settings Page Access Control
          </div>
          <div className="text-sm">
            Required Roles: ADMIN, SUPERADMIN<br/>
            Current Role: {user?.role || 'None'}<br/>
            Access Granted: {isAuthenticated && user && ['ADMIN', 'SUPERADMIN'].includes(user.role) ? 'Yes ✅' : 'No ❌'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthDebugInfo;