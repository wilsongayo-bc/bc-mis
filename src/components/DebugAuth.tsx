import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const DebugAuth: React.FC = () => {
  const { token, user: currentUser, isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  // Only render for SUPERADMIN users
  if (!isAuthenticated || !currentUser || currentUser.role !== 'SUPERADMIN') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 max-w-md">
      <h3 className="font-bold text-sm mb-2">🔍 Auth Debug Info</h3>
      <div className="text-xs space-y-1">
        <div><strong>Has Token:</strong> {token ? 'Yes' : 'No'}</div>
        <div><strong>Token Length:</strong> {token?.length || 'N/A'}</div>
        <div><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
        <div><strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}</div>
        <div><strong>Has User:</strong> {currentUser ? 'Yes' : 'No'}</div>
        <div><strong>User Role:</strong> {currentUser?.role || 'N/A'}</div>
        <div><strong>User Email:</strong> {currentUser?.email || 'N/A'}</div>
        <div><strong>Can Manage Users:</strong> {(currentUser?.role && ['ADMIN', 'SUPERADMIN'].includes(currentUser.role)) ? 'Yes' : 'No'}</div>
        <div><strong>Should Load Users:</strong> {((currentUser?.role && ['ADMIN', 'SUPERADMIN'].includes(currentUser.role)) && token) ? 'Yes' : 'No'}</div>
      </div>
    </div>
  );
};

export default DebugAuth;