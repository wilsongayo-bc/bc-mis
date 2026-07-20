import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';

interface UnderMaintenanceProps {
    title?: string;
    message?: string;
}

const UnderMaintenance: React.FC<UnderMaintenanceProps> = ({
    title = 'Page Under Maintenance',
    message = 'This feature is currently under development and will be available soon.'
}) => {
    const navigate = useNavigate();

    // Dweezil's Code
    const handleReturn = () => {
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-full">
                            <Construction className="h-16 w-16 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        {title}
                    </h1>

                    {/* Message */}
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        {message}
                    </p>

                    {/* Return Button */}
                    <button
                        onClick={handleReturn}
                        className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span>Return</span>
                    </button>

                    {/* Additional Info */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            We appreciate your patience as we work to improve this feature.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnderMaintenance;
