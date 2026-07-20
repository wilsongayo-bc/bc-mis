import React, { useState, useRef } from 'react';
import { Camera, Trash2 as _Trash2, User as _UserIcon, X, Upload, CheckCircle } from 'lucide-react';
import { uploadUserAvatar, deleteUserAvatar, User } from '../services/userService';
import { useAuth } from '../hooks/useAuth';

interface AvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showUpload?: boolean;
  onAvatarUpdate?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'md',
  showUpload = false,
  onAvatarUpdate,
}) => {
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-lg',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  const getInitials = () => {
    const firstName = user?.firstName || '';
    const lastName = user?.lastName || '';
    
    if (!firstName && !lastName) {
      return 'NA';
    }
    
    const firstInitial = firstName.charAt(0) || '';
    const lastInitial = lastName.charAt(0) || '';
    
    return `${firstInitial}${lastInitial}`.toUpperCase() || 'NA';
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);
    try {
      const _response = await uploadUserAvatar(token, user.id, file);
      setUploadSuccess(true);
      onAvatarUpdate?.();
      
      // Close modal after a brief success indication
      setTimeout(() => {
        setShowUploadOptions(false);
        setUploadSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!token) return;

    setIsUploading(true);
    setUploadSuccess(false);
    try {
      await deleteUserAvatar(token, user.id);
      setUploadSuccess(true);
      onAvatarUpdate?.();
      
      // Close modal after a brief success indication
      setTimeout(() => {
        setShowUploadOptions(false);
        setUploadSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error deleting avatar:', error);
      alert('Failed to delete avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden ${
          showUpload ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
        } ${
          user.avatarUrl
            ? 'bg-gray-200'
            : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium'
        }`}
        onClick={showUpload ? () => setShowUploadOptions(true) : undefined}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={`${user.firstName} ${user.lastName}`}
            className="w-full h-full object-cover"
            key={user.avatarUrl} // Force re-render when URL changes
          />
        ) : (
          <span>{getInitials()}</span>
        )}
        
        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
          </div>
        )}
        
        {showUpload && !isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 rounded-full flex items-center justify-center">
            <Camera className={`${iconSizes[size]} text-white opacity-0 hover:opacity-100 transition-opacity`} />
          </div>
        )}
      </div>

      {/* Upload Options Modal */}
      {showUploadOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Update Avatar</h3>
              <button
                onClick={() => setShowUploadOptions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-sm text-green-700">Avatar updated successfully!</span>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || uploadSuccess}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : uploadSuccess ? 'Upload Complete!' : 'Upload New Photo'}
              </button>

              {user.avatarUrl && (
                <button
                  onClick={handleDeleteAvatar}
                  disabled={isUploading || uploadSuccess}
                  className="w-full flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  {isUploading ? 'Removing...' : uploadSuccess ? 'Removed!' : 'Remove Photo'}
                </button>
              )}

              <button
                onClick={() => setShowUploadOptions(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default Avatar;