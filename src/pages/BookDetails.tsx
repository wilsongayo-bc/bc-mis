import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Edit,
  BookOpen,
  Calendar,
  MapPin,
  Globe,
  FileText,
  Hash,
  User,
  Building,
  Copy,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  XCircle,
  ExternalLink,
  UserX,
  UserCheck
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchBookById,
  updateBookStatus,
  selectCurrentBook,
  selectLibraryLoading,
  selectLibraryError,
  clearError,
  clearCurrentBook
} from '../store/slices/librarySlice';
import { selectUser } from '../store/slices/authSlice';
import { toast } from 'sonner';

const BookDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const book = useAppSelector(selectCurrentBook);
  const isLoading = useAppSelector(selectLibraryLoading);
  const error = useAppSelector(selectLibraryError);
  const user = useAppSelector(selectUser);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchBookById(id));
    }
    return () => {
      dispatch(clearCurrentBook());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleToggleStatus = async () => {
    if (!book || !id) return;
    
    setIsUpdatingStatus(true);
    try {
      await dispatch(updateBookStatus({ 
        bookId: id, 
        isActive: !book.isActive 
      })).unwrap();
      
      toast.success(`Book ${book.isActive ? 'deactivated' : 'activated'} successfully`);
      // Refresh book details to ensure we have the latest state
      dispatch(fetchBookById(id));
    } catch (_error) {
      toast.error(`Failed to ${book.isActive ? 'deactivate' : 'activate'} book`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getAvailabilityStatus = () => {
    if (!book) return { status: 'unknown', color: 'text-gray-600 dark:text-gray-400 bg-gray-100', text: 'Unknown' };
    
    if (book.availableCopies === 0) {
      return { status: 'unavailable', color: 'text-red-600 bg-red-100', text: 'Unavailable', icon: XCircle };
    } else if (book.availableCopies <= 2) {
      return { status: 'low', color: 'text-yellow-600 bg-yellow-100', text: 'Low Stock', icon: AlertCircle };
    } else {
      return { status: 'available', color: 'text-green-600 bg-green-100', text: 'Available', icon: CheckCircle };
    }
  };

  const canManageBooks = user?.role === 'ADMIN' || user?.role === 'TEACHER' || user?.role === 'LIBRARIAN';
  const canBorrowBooks = user?.role === 'STUDENT' || user?.role === 'TEACHER';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading book details...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Book not found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The book you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/books"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Books</span>
          </Link>
        </div>
      </div>
    );
  }

  const availability = getAvailabilityStatus();
  const StatusIcon = availability.icon || CheckCircle;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/books')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Book Details
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              View and manage library book information and status
            </p>
          </div>
        </div>
        
        {canManageBooks && (
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/books/${book.id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Book
            </Link>
            <button
              onClick={handleToggleStatus}
              disabled={isUpdatingStatus}
              className={`inline-flex items-center px-4 py-2 ${
                book.isActive 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white rounded-lg transition-colors shadow-sm text-sm font-medium disabled:opacity-50`}
            >
              {isUpdatingStatus ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                book.isActive ? <UserX className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />
              )}
              {book.isActive ? 'Set Inactive' : 'Set Active'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{book.title}</h2>
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4" />
                    <span>by {book.author}</span>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${availability.color}`}>
                  <StatusIcon className="h-4 w-4" />
                  <span>{availability.text}</span>
                </div>
              </div>

              {book.description && (
                <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Description</span>
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{book.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Hash className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">ISBN</p>
                      <p className="font-mono text-gray-900 dark:text-white">{book.isbn}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Building className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Publisher</p>
                      <p className="text-gray-900 dark:text-white">{book.publisher}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Published Year</p>
                      <p className="text-gray-900 dark:text-white">{book.publishedYear}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Globe className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Language</p>
                      <p className="text-gray-900 dark:text-white">{book.language || 'English'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <BookOpen className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Category</p>
                      <p className="text-gray-900 dark:text-white">{book.category}</p>
                    </div>
                  </div>
                  
                  {book.pages && (
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Pages</p>
                        <p className="text-gray-900 dark:text-white">{book.pages}</p>
                      </div>
                    </div>
                  )}
                  
                  {book.edition && (
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Copy className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Edition</p>
                        <p className="text-gray-900 dark:text-white">{book.edition}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <MapPin className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Location</p>
                      <p className="text-gray-900 dark:text-white">{book.location}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Record Information Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>System Record</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mb-1">Added to Library</p>
                  <p className="text-gray-900 dark:text-white font-medium">{new Date(book.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mb-1">Last Updated</p>
                  <p className="text-gray-900 dark:text-white font-medium">{new Date(book.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Availability Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>Inventory Status</span>
              </h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Total Copies</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{book.totalCopies}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Available</span>
                  <span className={`text-2xl font-bold ${
                    book.availableCopies === 0 ? 'text-red-600' :
                    book.availableCopies <= 2 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {book.availableCopies}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Borrowed</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {book.totalCopies - book.availableCopies}
                  </span>
                </div>
                
                {/* Availability Progress Bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    <span>UTILIZATION</span>
                    <span>{Math.round((book.availableCopies / book.totalCopies) * 100)}% Available</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        book.availableCopies === 0 ? 'bg-red-500' :
                        book.availableCopies <= 2 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(book.availableCopies / book.totalCopies) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Digital Resource Card */}
            {book.externalLink && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>Digital Access</span>
                </h3>
                <a
                  href={book.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium text-sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Access Digital Copy
                </a>
              </div>
            )}

            {/* Actions Card */}
            {canBorrowBooks && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Borrowing Actions</h3>
                <div className="space-y-3">
                  {book.availableCopies > 0 ? (
                    <Link
                      to={`/borrow-records/new?bookId=${book.id}`}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block font-medium shadow-sm"
                    >
                      Borrow This Book
                    </Link>
                  ) : (
                    <div className="w-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg text-center font-medium">
                      Currently Unavailable
                    </div>
                  )}
                  
                  <Link
                    to={`/borrow-records?bookId=${book.id}`}
                    className="w-full bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-center block font-medium border border-gray-100 dark:border-gray-800"
                  >
                    View Borrow History
                  </Link>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Library Analytics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Times Borrowed</span>
                  <span className="font-bold text-gray-900 dark:text-white">{book.totalCopies - book.availableCopies}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Circulation Rate</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {Math.round(((book.totalCopies - book.availableCopies) / book.totalCopies) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Popularity</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    (book.totalCopies - book.availableCopies) / book.totalCopies > 0.7 ? 'bg-orange-100 text-orange-700' :
                    (book.totalCopies - book.availableCopies) / book.totalCopies > 0.3 ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {book.availableCopies === book.totalCopies ? 'New' :
                     (book.totalCopies - book.availableCopies) / book.totalCopies > 0.7 ? 'High' :
                     (book.totalCopies - book.availableCopies) / book.totalCopies > 0.3 ? 'Medium' : 'Low'}
                  </span>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default BookDetails;