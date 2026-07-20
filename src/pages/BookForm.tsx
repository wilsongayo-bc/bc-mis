import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, BookOpen, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  createBook,
  updateBook,
  fetchBookById,
  selectCurrentBook,
  selectLibraryLoading,
  selectLibraryError,
  clearError,
  clearCurrentBook,
  CreateBookData,
  UpdateBookData
} from '../store/slices/librarySlice';
// import { toast } from 'sonner'; // Temporarily disabled

interface FormData {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishedYear: number;
  category: string;
  description: string;
  totalCopies: number;
  location: string;
  language: string;
  pages?: number;
  edition?: string;
  externalLink?: string;
  gradeLevelId?: string;
  courseId?: string;
}

interface FormErrors {
  title?: string;
  author?: string;
  isbn?: string;
  publisher?: string;
  publishedYear?: string;
  category?: string;
  totalCopies?: string;
  location?: string;
  language?: string;
  pages?: string;
}

const BookForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentBook = useAppSelector(selectCurrentBook);
  const isLoading = useAppSelector(selectLibraryLoading);
  const error = useAppSelector(selectLibraryError);

  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    publishedYear: new Date().getFullYear(),
    category: '',
    description: '',
    totalCopies: 1,
    location: '',
    language: 'English',
    pages: undefined,
    edition: '',
    externalLink: '',
    gradeLevelId: '',
    courseId: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradeLevels, setGradeLevels] = useState<Array<{ id: string; name: string }>>([]);
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (isEditing && id) {
      dispatch(fetchBookById(id));
    }
    return () => {
      dispatch(clearCurrentBook());
    };
  }, [dispatch, id, isEditing]);

  // Dweezil's Code
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        // Import api from lib/api to use authenticated requests
        const api = (await import('../lib/api')).default;

        const [gradeLevelsRes, coursesRes] = await Promise.all([
          api.get('/grade-levels'),
          api.get('/courses')
        ]);

        if (gradeLevelsRes.data?.data) {
          setGradeLevels(gradeLevelsRes.data.data.filter((gl: { isActive: boolean }) => gl.isActive));
        }
        if (coursesRes.data?.data) {
          setCourses(coursesRes.data.data.filter((c: { isActive: boolean }) => c.isActive));
        }
      } catch (error) {
        console.error('Failed to fetch dropdown data:', error);
      }
    };

    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (currentBook && isEditing) {
      setFormData({
        title: currentBook.title,
        author: currentBook.author,
        isbn: currentBook.isbn,
        publisher: currentBook.publisher,
        publishedYear: currentBook.publishedYear,
        category: currentBook.category,
        description: currentBook.description || '',
        totalCopies: currentBook.totalCopies,
        location: currentBook.location,
        language: currentBook.language || 'English',
        pages: currentBook.pages,
        edition: currentBook.edition || '',
        externalLink: currentBook.externalLink || '',
        gradeLevelId: (currentBook as { gradeLevelId?: string }).gradeLevelId || '',
        courseId: (currentBook as { courseId?: string }).courseId || ''
      });
    }
  }, [currentBook, isEditing]);

  useEffect(() => {
    if (error) {
      console.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 2) {
      newErrors.title = 'Title must be at least 2 characters long';
    }

    // Author validation
    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    } else if (formData.author.length < 2) {
      newErrors.author = 'Author name must be at least 2 characters long';
    }

    // ISBN validation
    if (!formData.isbn.trim()) {
      newErrors.isbn = 'ISBN is required';
    } else {
      const isbnRegex = /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/;
      if (!isbnRegex.test(formData.isbn.replace(/[- ]/g, ''))) {
        newErrors.isbn = 'Please enter a valid ISBN';
      }
    }

    // Publisher validation
    if (!formData.publisher.trim()) {
      newErrors.publisher = 'Publisher is required';
    }

    // Published year validation
    const currentYear = new Date().getFullYear();
    if (!formData.publishedYear) {
      newErrors.publishedYear = 'Published year is required';
    } else if (formData.publishedYear < 1000 || formData.publishedYear > currentYear) {
      newErrors.publishedYear = `Published year must be between 1000 and ${currentYear}`;
    }

    // Category validation
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    // Total copies validation
    if (!formData.totalCopies || formData.totalCopies < 1) {
      newErrors.totalCopies = 'Total copies must be at least 1';
    } else if (formData.totalCopies > 1000) {
      newErrors.totalCopies = 'Total copies cannot exceed 1000';
    }

    // Location validation
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    // Language validation
    if (!formData.language.trim()) {
      newErrors.language = 'Language is required';
    }

    // Pages validation (optional)
    if (formData.pages && (formData.pages < 1 || formData.pages > 10000)) {
      newErrors.pages = 'Pages must be between 1 and 10000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'publishedYear' || name === 'totalCopies' || name === 'pages'
        ? value === '' ? undefined : parseInt(value, 10)
        : value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      console.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && id) {
        const updateData: UpdateBookData = {
          ...formData,
          pages: formData.pages || undefined,
          edition: formData.edition || undefined,
          externalLink: formData.externalLink || undefined
        };
        await dispatch(updateBook({ bookId: id, bookData: updateData })).unwrap();
        console.log('Book updated successfully');
      } else {
        const createData: CreateBookData = {
          ...formData,
          pages: formData.pages || undefined,
          edition: formData.edition || undefined,
          externalLink: formData.externalLink || undefined
        };
        await dispatch(createBook(createData)).unwrap();
        console.log('Book created successfully');
      }
      navigate('/books');
    } catch (error: unknown) {
      console.error(error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} book`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && isEditing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading book details...</p>
        </div>
      </div>
    );
  }

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
              {isEditing ? 'Edit Book' : 'New Book'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {isEditing ? 'Update book information and library availability' : 'Add a new book to the library collection'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.title ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Enter book title"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.title}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="author" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Author *
                  </label>
                  <input
                    type="text"
                    id="author"
                    name="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.author ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Enter author name"
                  />
                  {errors.author && (
                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.author}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="isbn" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ISBN *
                  </label>
                  <input
                    type="text"
                    id="isbn"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.isbn ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Enter ISBN"
                  />
                  {errors.isbn && (
                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.isbn}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="publisher" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Publisher *
                  </label>
                  <input
                    type="text"
                    id="publisher"
                    name="publisher"
                    value={formData.publisher}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.publisher ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Enter publisher name"
                  />
                  {errors.publisher && (
                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.publisher}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="publishedYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Published Year *
                  </label>
                  <input
                    type="number"
                    id="publishedYear"
                    name="publishedYear"
                    value={formData.publishedYear || ''}
                    onChange={handleInputChange}
                    min="1000"
                    max={new Date().getFullYear()}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.publishedYear ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Enter published year"
                  />
                  {errors.publishedYear && (
                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.publishedYear}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.category ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  >
                    <option value="">Select a category</option>
                    <option value="Fiction">Fiction</option>
                    <option value="Non-Fiction">Non-Fiction</option>
                    <option value="Science">Science</option>
                    <option value="History">History</option>
                    <option value="Biography">Biography</option>
                    <option value="Technology">Technology</option>
                    <option value="Arts">Arts</option>
                    <option value="Reference">Reference</option>
                    <option value="Children">Children</option>
                    <option value="Young Adult">Young Adult</option>
                    <option value="Academic">Academic</option>
                    <option value="Self-Help">Self-Help</option>
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.category}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language *
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.language ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Italian">Italian</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Korean">Korean</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Russian">Russian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="pages" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pages
                  </label>
                  <input
                    type="number"
                    id="pages"
                    name="pages"
                    value={formData.pages || ''}
                    onChange={handleInputChange}
                    min="1"
                    max="10000"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.pages ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Enter number of pages"
                  />
                </div>

                <div>
                  <label htmlFor="edition" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Edition
                  </label>
                  <input
                    type="text"
                    id="edition"
                    name="edition"
                    value={formData.edition}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., 1st, 2nd, Revised"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Description</h2>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter book description"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Academic Link Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Academic Context</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="gradeLevelId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Grade Level
                  </label>
                  <select
                    id="gradeLevelId"
                    name="gradeLevelId"
                    value={formData.gradeLevelId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select grade level (optional)</option>
                    {gradeLevels.map(level => (
                      <option key={level.id} value={level.id}>{level.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Course
                  </label>
                  <select
                    id="courseId"
                    name="courseId"
                    value={formData.courseId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select course (optional)</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Inventory Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Inventory</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="totalCopies" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Copies *
                  </label>
                  <input
                    type="number"
                    id="totalCopies"
                    name="totalCopies"
                    value={formData.totalCopies || ''}
                    onChange={handleInputChange}
                    min="1"
                    max="1000"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.totalCopies ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Enter total copies"
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.location ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="e.g., A1-B2, Shelf 15"
                  />
                </div>
              </div>
            </div>

            {/* External Resource Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Digital Resource</h2>
              <div>
                <label htmlFor="externalLink" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  External File Link
                </label>
                <input
                  type="url"
                  id="externalLink"
                  name="externalLink"
                  value={formData.externalLink}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://example.com/file.pdf"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/books')}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm font-medium"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{isEditing ? 'Update Book' : 'Create Book'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookForm;