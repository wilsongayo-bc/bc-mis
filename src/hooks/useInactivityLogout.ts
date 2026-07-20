import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { logout, selectIsAuthenticated } from '../store/slices/authSlice';

/**
 * Custom hook to handle automatic logout on user inactivity
 * Tracks user activity and logs out after configured timeout
 * 
 * Features:
 * - Tracks mouse, keyboard, touch, and scroll events
 * - Actively checks for timeout expiration every second
 * - Logs out immediately on next activity after timeout
 * - Logs out automatically even without user interaction
 */
export const useInactivityLogout = (timeoutMinutes: number = 30) => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoggedOutRef = useRef<boolean>(false);

  const handleLogout = useCallback(() => {
    if (hasLoggedOutRef.current) return; // Prevent multiple logout calls
    
    hasLoggedOutRef.current = true;
    console.log('🔒 Auto-logout triggered due to inactivity');
    dispatch(logout());
  }, [dispatch]);

  const checkInactivity = useCallback(() => {
    const now = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const timeSinceLastActivity = now - lastActivityRef.current;

    if (timeSinceLastActivity >= timeoutMs) {
      console.log(`⏰ Inactivity timeout exceeded (${Math.floor(timeSinceLastActivity / 1000)}s since last activity)`);
      handleLogout();
      return true;
    }
    return false;
  }, [timeoutMinutes, handleLogout]);

  const handleActivity = useCallback(() => {
    // Check if already timed out before updating activity
    if (checkInactivity()) {
      return; // Already logged out
    }

    // Update last activity timestamp
    lastActivityRef.current = Date.now();
  }, [checkInactivity]);

  useEffect(() => {
    // Only track activity if user is authenticated
    if (!isAuthenticated) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      hasLoggedOutRef.current = false;
      return;
    }

    // Reset logout flag when authenticated
    hasLoggedOutRef.current = false;

    // Activity event handlers
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Throttle activity tracking to avoid excessive updates
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledHandleActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          handleActivity();
          throttleTimeout = null;
        }, 1000); // Throttle to once per second
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, throttledHandleActivity);
    });

    // Initialize last activity timestamp
    lastActivityRef.current = Date.now();

    // Check for inactivity every second
    checkIntervalRef.current = setInterval(() => {
      checkInactivity();
    }, 1000); // Check every second

    console.log(`✅ Inactivity tracking enabled (timeout: ${timeoutMinutes} minutes)`);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, throttledHandleActivity);
      });
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [isAuthenticated, handleActivity, checkInactivity, timeoutMinutes]);

  return {
    lastActivity: lastActivityRef.current
  };
};
