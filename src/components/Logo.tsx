import React, { useState, useContext } from 'react';
import { ImageIcon } from 'lucide-react';
import { BrandingContext } from '../contexts/BrandingContextDefinition';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackText?: string;
}

/**
 * Reusable Logo component that displays the school logo
 * Falls back to a placeholder if no logo is available
 */
export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  className = '', 
  fallbackText = 'School Logo' 
}) => {
  const branding = useContext(BrandingContext);
  const [error, setError] = useState(false);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 w-8';
      case 'md':
        return 'h-12 w-12';
      case 'lg':
        return 'h-16 w-16';
      case 'xl':
        return 'h-20 w-20';
      default:
        return 'h-12 w-12';
    }
  };

  const handleImageError = () => {
    setError(true);
  };

  if (branding?.loading) {
    return (
      <div className={`${getSizeClasses()} bg-gray-200 animate-pulse rounded ${className}`} />
    );
  }

  if (branding?.logoUrl && !error) {
    return (
      <img
        key={branding.logoUrl} // Force re-render when URL changes
        src={branding.logoUrl}
        alt={fallbackText}
        className={`${getSizeClasses()} object-contain ${className}`}
        onError={handleImageError}
      />
    );
  }

  // Show fallback when no logo or error
  return (
    <div className={`${getSizeClasses()} bg-blue-600 text-white rounded-lg flex items-center justify-center ${className}`}>
      <ImageIcon className="w-1/2 h-1/2" />
    </div>
  );
};

export default Logo;