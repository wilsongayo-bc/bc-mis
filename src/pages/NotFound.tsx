import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useSettingsContext } from '../utils/settingsUtils';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useSettingsContext();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-200 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className={`max-w-md w-full rounded-lg shadow-lg p-8 text-center transition-colors duration-200 ${
        theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className="flex justify-center mb-6">
          <Search className={`h-16 w-16 ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
          }`} />
        </div>
        
        <h1 className={`text-4xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          404
        </h1>
        
        <h2 className={`text-xl font-semibold mb-4 ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
        }`}>
          Page Not Found
        </h2>
        
        <p className={`mb-8 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        
        <div className="space-y-3">
          <Link
            to="/dashboard"
            className={`w-full flex items-center justify-center px-6 py-3 rounded-md transition-colors ${
              theme === 'dark' 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Link>
          
          <button
            onClick={handleGoBack}
            className={`w-full flex items-center justify-center px-6 py-3 rounded-md transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>
        
        <div className={`mt-8 pt-6 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Need help? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;