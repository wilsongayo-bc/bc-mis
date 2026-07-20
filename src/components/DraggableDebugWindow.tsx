import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useLocation } from 'react-router-dom';

interface Position {
  x: number;
  y: number;
}

interface AuthStateSnapshot {
  timestamp: string;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasUser: boolean;
  userRole?: string;
  pathname: string;
  event: string;
}

const DraggableDebugWindow: React.FC = () => {
  const location = useLocation();
  const { isLoading, isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  // Debug mode state
  const [debugMode, setDebugMode] = useState(() => {
    return localStorage.getItem('debugMode') === 'true';
  });
  
  // Window state
  const [position, setPosition] = useState<Position>({ x: window.innerWidth - 320, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  
  // Debug state
  const snapshotsRef = useRef<AuthStateSnapshot[]>([]);
  const lastStateRef = useRef<string>('');
  const mountTimeRef = useRef<number>(Date.now());
  const lastLogRef = useRef<string>('');
  
  const windowRef = useRef<HTMLDivElement>(null);

  // Listen for debug mode changes
  useEffect(() => {
    const handleDebugModeChange = () => {
      setDebugMode(localStorage.getItem('debugMode') === 'true');
    };

    window.addEventListener('debugModeChanged', handleDebugModeChange);
    return () => {
      window.removeEventListener('debugModeChanged', handleDebugModeChange);
    };
  }, []);

  // Track authentication state changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && debugMode) {
      const createSnapshot = (event: string): AuthStateSnapshot => {
        return {
          timestamp: new Date().toISOString(),
          isLoading,
          isAuthenticated,
          hasUser: !!user,
          userRole: user?.role,
          pathname: location.pathname,
          event
        };
      };

      const logStateChange = (snapshot: AuthStateSnapshot) => {
        const stateKey = `${snapshot.isLoading}-${snapshot.isAuthenticated}-${snapshot.hasUser}-${snapshot.userRole}`;
        
        if (lastStateRef.current !== stateKey) {
          console.log(`🔍 [DraggableDebugWindow] State Change - ${snapshot.event}:`, {
            ...snapshot,
            stateTransition: `${lastStateRef.current} → ${stateKey}`
          });
          
          // Special logging for Settings page
          if (snapshot.pathname === '/settings') {
            console.log('🎯 [DraggableDebugWindow] Settings Page State:', {
              canAccess: snapshot.isAuthenticated && snapshot.hasUser && ['ADMIN', 'SUPERADMIN'].includes(snapshot.userRole || ''),
              missingRequirements: {
                notAuthenticated: !snapshot.isAuthenticated,
                noUser: !snapshot.hasUser,
                wrongRole: snapshot.hasUser && !['ADMIN', 'SUPERADMIN'].includes(snapshot.userRole || '')
              }
            });
          }
          
          lastStateRef.current = stateKey;
        }
        
        snapshotsRef.current.push(snapshot);
        
        // Keep only last 20 snapshots
        if (snapshotsRef.current.length > 20) {
          snapshotsRef.current = snapshotsRef.current.slice(-20);
        }
      };

      const snapshot = createSnapshot('Auth State Change');
      logStateChange(snapshot);
      
      console.log('🔍 DebugAuthState - State Change:', {
        timestamp: new Date().toISOString(),
        isLoading,
        isAuthenticated,
        hasUser: !!user,
        userRole: user?.role,
        userId: user?.id,
        hasToken: !!localStorage.getItem('token'),
        stackTrace: new Error().stack?.split('\n').slice(1, 5).join('\n')
      });
    }
  }, [user, isLoading, isAuthenticated, debugMode, location.pathname]);

  // Track route changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && debugMode) {
      const createSnapshot = (event: string): AuthStateSnapshot => {
        return {
          timestamp: new Date().toISOString(),
          isLoading,
          isAuthenticated,
          hasUser: !!user,
          userRole: user?.role,
          pathname: location.pathname,
          event
        };
      };

      const logStateChange = (snapshot: AuthStateSnapshot) => {
        const stateKey = `${snapshot.isLoading}-${snapshot.isAuthenticated}-${snapshot.hasUser}-${snapshot.userRole}`;
        
        if (lastStateRef.current !== stateKey) {
          console.log(`🔍 [DraggableDebugWindow] State Change - ${snapshot.event}:`, {
            ...snapshot,
            stateTransition: `${lastStateRef.current} → ${stateKey}`
          });
          
          lastStateRef.current = stateKey;
        }
        
        snapshotsRef.current.push(snapshot);
        
        // Keep only last 20 snapshots
        if (snapshotsRef.current.length > 20) {
          snapshotsRef.current = snapshotsRef.current.slice(-20);
        }
      };

      const snapshot = createSnapshot('Route Change');
      logStateChange(snapshot);
      
      console.log('🗺️ [DraggableDebugWindow] Route Change:', {
        newPath: location.pathname,
        authState: {
          isLoading,
          isAuthenticated,
          hasUser: !!user,
          userRole: user?.role
        },
        timestamp: new Date().toISOString()
      });
    }
  }, [location.pathname, debugMode, isLoading, isAuthenticated, user]);

  // Settings page specific debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && debugMode && location.pathname === '/settings') {
      const timeSinceMount = Date.now() - mountTimeRef.current;
      const currentState = `${isLoading}-${isAuthenticated}-${!!user}-${user?.role}`;
      
      // Only log if state has changed
      if (lastLogRef.current !== currentState) {
        console.log('🎯 [DraggableDebugWindow] Settings page state change:', {
          timeSinceMount: `${timeSinceMount}ms`,
          authState: {
            isLoading,
            isAuthenticated,
            hasUser: !!user,
            userRole: user?.role,
            hasToken: !!localStorage.getItem('token')
          },
          routeInfo: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash
          },
          accessCheck: {
            requiredRoles: ['ADMIN', 'SUPERADMIN'],
            userRole: user?.role,
            hasAccess: user && ['ADMIN', 'SUPERADMIN'].includes(user.role),
            shouldRedirect: !isLoading && (!isAuthenticated || !user || !['ADMIN', 'SUPERADMIN'].includes(user.role))
          },
          timestamp: new Date().toISOString()
        });
        
        lastLogRef.current = currentState;
      }
      
      // Check for potential race conditions
      if (timeSinceMount > 5000 && isLoading) {
        console.error('🚨 [DraggableDebugWindow] RACE CONDITION DETECTED: Still loading after 5 seconds on Settings page!');
      }
      
      // Check if we're about to redirect
      if (!isLoading && (!isAuthenticated || !user || !['ADMIN', 'SUPERADMIN'].includes(user.role))) {
        console.error('🔥 [DraggableDebugWindow] REDIRECT IMMINENT:', {
          reason: !isAuthenticated ? 'Not authenticated' : 
                  !user ? 'No user data' : 
                  'Insufficient role permissions',
          currentRole: user?.role,
          requiredRoles: ['ADMIN', 'SUPERADMIN']
        });
      }
    }
  }, [location.pathname, isLoading, isAuthenticated, user, debugMode, location.search, location.hash]);

  // Add global mouse event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 200, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Prevent window from going off-screen on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.max(0, Math.min(window.innerWidth - 300, prev.x)),
        y: Math.max(0, Math.min(window.innerHeight - 200, prev.y))
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Only render in development, when debug mode is enabled, and user is SUPERADMIN
  if (process.env.NODE_ENV !== 'development' || !debugMode || !isAuthenticated || !user || user.role !== 'SUPERADMIN') {
    return null;
  }

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  return (
    <div
      ref={windowRef}
      className={`fixed bg-black bg-opacity-90 text-white rounded-lg shadow-lg border border-gray-600 z-[9999] select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '300px',
        minHeight: isMinimized ? '40px' : '200px'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-2 bg-gray-800 rounded-t-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="text-yellow-400 font-bold text-sm">🔍 Auth Debug</div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700"
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <div className="text-xs text-gray-400">
            Path: {location.pathname}
          </div>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-3 text-xs font-mono space-y-2">
          {/* Basic Auth State */}
          <div className="space-y-1">
            <div>Loading: {isLoading ? '🔄' : '✅'}</div>
            <div>Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
            <div>User: {user ? '✅' : '❌'}</div>
            <div>Role: {user?.role || 'N/A'}</div>
            <div>Token: {localStorage.getItem('token') ? '✅' : '❌'}</div>
          </div>

          {/* Settings Page Specific */}
          {location.pathname === '/settings' && (
            <div className="mt-2 p-2 bg-red-900 bg-opacity-50 rounded border border-red-700">
              <div className="text-red-300 font-bold mb-1">Settings Access</div>
              <div>
                Can Access: {isAuthenticated && user && ['ADMIN', 'SUPERADMIN'].includes(user.role) ? '✅' : '❌'}
              </div>
              {(!isAuthenticated || !user || !['ADMIN', 'SUPERADMIN'].includes(user.role)) && (
                <div className="text-red-400 text-xs mt-1">
                  Issue: {!isAuthenticated ? 'Not authenticated' : 
                          !user ? 'No user data' : 
                          'Insufficient role'}
                </div>
              )}
            </div>
          )}

          {/* Recent Activity */}
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-gray-400 text-xs mb-1">Recent Activity:</div>
            <div className="text-xs text-gray-300 max-h-16 overflow-y-auto">
              {snapshotsRef.current.slice(-3).map((snapshot, index) => (
                <div key={index} className="truncate">
                  {snapshot.event}: {snapshot.isAuthenticated ? '✅' : '❌'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraggableDebugWindow;