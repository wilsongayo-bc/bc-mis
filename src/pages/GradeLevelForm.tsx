import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, BookOpen, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { useCurrentAcademicYear } from '../hooks/useAcademicYear';

interface FormData {
    name: string;
    description: string;
    levelOrder: number;
    minAge: number | undefined;
    maxAge: number | undefined;
    maxStudents: number;
    academicYear: string;
    isActive: boolean;
}

interface FormErrors {
    name?: string;
    levelOrder?: string;
    minAge?: string;
    maxAge?: string;
    maxStudents?: string;
    academicYear?: string;
}

const GradeLevelForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = Boolean(id);
    const { academicYear: currentAcademicYear, loading: academicYearLoading } = useCurrentAcademicYear();

    const [formData, setFormData] = useState<FormData>({
        name: '',
        description: '',
        levelOrder: 1,
        minAge: undefined,
        maxAge: undefined,
        maxStudents: 30,
        academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        isActive: true
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Dweezil's Code
        if (isEditing && id) {
            const fetchGradeLevel = async () => {
                try {
                    setLoading(true);
                    const response = await api.get(`/grade-levels/${id}`);
                    const data = response.data?.data;
                    if (data) {
                        setFormData({
                            name: data.name,
                            description: data.description || '',
                            levelOrder: data.levelOrder,
                            minAge: data.minAge,
                            maxAge: data.maxAge,
                            maxStudents: data.maxStudents,
                            academicYear: currentAcademicYear || data.academicYear,
                            isActive: data.isActive
                        });
                    }
                } catch (error) {
                    console.error('Failed to fetch grade level:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchGradeLevel();
        }
    }, [id, isEditing, currentAcademicYear]);

    useEffect(() => {
        if (!isEditing && !academicYearLoading && currentAcademicYear) {
            setFormData(prev => ({ ...prev, academicYear: currentAcademicYear }));
        }
    }, [isEditing, academicYearLoading, currentAcademicYear]);

    // Dweezil's Code
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.levelOrder || formData.levelOrder < 1) {
            newErrors.levelOrder = 'Level order must be at least 1';
        }

        if (formData.minAge && formData.maxAge && formData.minAge > formData.maxAge) {
            newErrors.minAge = 'Minimum age cannot be greater than maximum age';
        }

        if (!formData.maxStudents || formData.maxStudents < 1) {
            newErrors.maxStudents = 'Maximum students must be at least 1';
        }

        if (!formData.academicYear.trim()) {
            newErrors.academicYear = 'Academic year is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked :
                type === 'number' ? (value === '' ? undefined : parseInt(value, 10)) :
                    value
        }));

        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    // Dweezil's Code
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            if (isEditing && id) {
                await api.put(`/grade-levels/${id}`, formData);
            } else {
                await api.post('/grade-levels', formData);
            }
            navigate('/grade-levels');
        } catch (error) {
            console.error('Failed to save grade level:', error);
            alert(`Failed to ${isEditing ? 'update' : 'create'} grade level`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading grade level...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate('/grade-levels')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {isEditing ? 'Edit Grade Level' : 'Add New Grade Level'}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                {isEditing ? 'Update grade level information' : 'Create a new grade level'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <BookOpen className="h-5 w-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Grade Level Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.name ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    placeholder="e.g., Grade 1, Kindergarten"
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>{errors.name}</span>
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="Optional description"
                                />
                            </div>

                            <div>
                                <label htmlFor="levelOrder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Level Order *
                                </label>
                                <input
                                    type="number"
                                    id="levelOrder"
                                    name="levelOrder"
                                    value={formData.levelOrder || ''}
                                    onChange={handleInputChange}
                                    min="1"
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.levelOrder ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                />
                                {errors.levelOrder && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>{errors.levelOrder}</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Academic Year *
                                </label>
                                <input
                                    type="text"
                                    id="academicYear"
                                    name="academicYear"
                                    value={formData.academicYear}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label htmlFor="minAge" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Minimum Age
                                </label>
                                <input
                                    type="number"
                                    id="minAge"
                                    name="minAge"
                                    value={formData.minAge || ''}
                                    onChange={handleInputChange}
                                    min="1"
                                    max="100"
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.minAge ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                />
                                {errors.minAge && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>{errors.minAge}</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="maxAge" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Maximum Age
                                </label>
                                <input
                                    type="number"
                                    id="maxAge"
                                    name="maxAge"
                                    value={formData.maxAge || ''}
                                    onChange={handleInputChange}
                                    min="1"
                                    max="100"
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.maxAge ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                />
                                {errors.maxAge && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>{errors.maxAge}</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="maxStudents" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Maximum Students *
                                </label>
                                <input
                                    type="number"
                                    id="maxStudents"
                                    name="maxStudents"
                                    value={formData.maxStudents || ''}
                                    onChange={handleInputChange}
                                    min="1"
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.maxStudents ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                />
                                {errors.maxStudents && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>{errors.maxStudents}</span>
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleInputChange}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Active
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={() => navigate('/grade-levels')}
                            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    <span>{isEditing ? 'Update Grade Level' : 'Create Grade Level'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GradeLevelForm;
