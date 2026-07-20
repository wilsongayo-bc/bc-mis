import React, { useState, useEffect } from 'react';
import { checkBackendConnectivity } from '../../lib/api';
import { AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const result = await checkBackendConnectivity();
      setIsConnected(result.connected);
      setMessage(result.message);
    } catch (_error) {
      setIsConnected(false);
      setMessage('Failed to check connection status');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (isConnected === null && !isChecking) {
    return null;
  }

  const getStatusColor = () => {
    if (isChecking) return 'text-yellow-500';
    return isConnected ? 'text-green-500' : 'text-red-500';
  };

  const getStatusIcon = () => {
    if (isChecking) return <Wifi className="w-4 h-4 animate-pulse" />;
    if (isConnected) return <CheckCircle className="w-4 h-4" />;
    return <WifiOff className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking connection...';
    return isConnected ? 'Connected' : 'Disconnected';
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${getStatusColor()} ${className}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className={getStatusColor()}>
          {getStatusIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Backend Server Status</h3>
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{message}</p>
          {!isConnected && !isChecking && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">Server not running</p>
                  <p className="mt-1">
                    To start the backend server, run one of these commands in your terminal:
                  </p>
                  <ul className="mt-2 space-y-1 font-mono text-xs bg-red-100 p-2 rounded">
                    <li>• npm run server:dev</li>
                    <li>• npm run dev</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={checkConnection}
          disabled={isChecking}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
        >
          {isChecking ? 'Checking...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

export default ConnectionStatus;