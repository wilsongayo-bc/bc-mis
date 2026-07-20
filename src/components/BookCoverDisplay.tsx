import React, { useState, useEffect } from 'react';
import { BookOpen, ImageIcon, X } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  coverImageUrl?: string | null;
  thumbnailUrl?: string | null;
}

interface BookCoverDisplayProps {
  book: Book;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTitle?: boolean;
  className?: string;
  onClick?: () => void;
}

const BookCoverDisplay: React.FC<BookCoverDisplayProps> = ({
  book,
  size = 'md',
  showTitle = false,
  className = '',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  // Reset image state when book changes
  useEffect(() => {
    setImageError(false);
    setCurrentImageUrl(null);
  }, [book.id, book.coverImageUrl, book.thumbnailUrl]);

  const sizeClasses = {
    sm: 'w-12 h-16',
    md: 'w-16 h-24',
    lg: 'w-20 h-30',
    xl: 'w-24 h-36',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  const defaultCoverUrl = '/default-book-cover.svg';
  
  // Determine which image to display with fallback logic
  const getDisplayImageUrl = () => {
    if (currentImageUrl) return currentImageUrl;
    return book.thumbnailUrl || book.coverImageUrl || defaultCoverUrl;
  };
  
  const displayImageUrl = getDisplayImageUrl();
  const fullImageUrl = book.coverImageUrl || book.thumbnailUrl || defaultCoverUrl;

  const handleImageError = () => {
    const currentUrl = getDisplayImageUrl();
    
    if (currentUrl === book.thumbnailUrl && book.coverImageUrl) {
      // Thumbnail failed, try cover image
      setCurrentImageUrl(book.coverImageUrl);
      setImageError(false);
    } else if ((currentUrl === book.coverImageUrl || currentUrl === book.thumbnailUrl) && currentUrl !== defaultCoverUrl) {
      // Cover/thumbnail failed, try default cover
      setCurrentImageUrl(defaultCoverUrl);
      setImageError(false);
    } else {
      // Default cover also failed, show placeholder
      setImageError(true);
    }
  };

  const handleImageClick = () => {
    if (fullImageUrl && !imageError) {
      setShowFullImage(true);
    } else if (onClick) {
      onClick();
    }
  };

  const renderPlaceholder = () => (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
      <BookOpen className={iconSizes[size]} />
      <div className={`${textSizes[size]} font-medium text-center mt-1 px-1 leading-tight`}>
        <div className="truncate">{book.title}</div>
        <div className="truncate text-gray-400">{book.author}</div>
      </div>
    </div>
  );

  const renderImage = () => (
    <div className={`${sizeClasses[size]} relative group ${onClick || fullImageUrl ? 'cursor-pointer' : ''}`}>
      <img
        src={displayImageUrl!}
        alt={`Cover of ${book.title}`}
        className={`w-full h-full object-cover rounded-lg border border-gray-200 shadow-sm ${onClick || fullImageUrl ? 'hover:shadow-md transition-shadow' : ''}`}
        onError={handleImageError}
        onClick={handleImageClick}
      />
      
      {/* Hover overlay for full image preview */}
      {fullImageUrl && !imageError && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );

  return (
    <div className={`inline-block ${className}`}>
      {/* Book Cover Display */}
      {displayImageUrl && !imageError ? renderImage() : renderPlaceholder()}
      
      {/* Optional Title Below Cover */}
      {showTitle && (
        <div className={`mt-2 ${textSizes[size]} text-center max-w-${sizeClasses[size].split(' ')[0]}`}>
          <div className="font-medium text-gray-900 truncate">{book.title}</div>
          <div className="text-gray-600 truncate">{book.author}</div>
        </div>
      )}

      {/* Full Image Modal */}
      {showFullImage && fullImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-2xl max-h-full">
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={fullImageUrl}
              alt={`Full cover of ${book.title}`}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={() => setShowFullImage(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 rounded-b-lg">
              <h3 className="text-white font-medium text-lg">{book.title}</h3>
              <p className="text-gray-300">{book.author}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookCoverDisplay;