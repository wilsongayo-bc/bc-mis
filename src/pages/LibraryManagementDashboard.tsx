import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Library,
    BookOpen,
    FileText,
    ClipboardList,
    BarChart3,
    AlertTriangle,
    TrendingUp,
    Users,
    BookMarked
} from 'lucide-react';
import api from '../lib/api';

interface LibraryStats {
    totalBooks: number;
    availableBooks: number;
    borrowedBooks: number;
    overdueBooks: number;
    totalBorrowRecords: number;
    activeMembers: number;
}

const LibraryManagementDashboard: React.FC = () => {
    const [stats, setStats] = useState<LibraryStats>({
        totalBooks: 0,
        availableBooks: 0,
        borrowedBooks: 0,
        overdueBooks: 0,
        totalBorrowRecords: 0,
        activeMembers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Dweezil's Code
        const fetchLibraryStats = async () => {
            try {
                setLoading(true);
                // Fetch books data
                const booksResponse = await api.get('/books');
                const booksData = booksResponse.data?.data || [];
                const books = Array.isArray(booksData) ? booksData : [];

                const totalBooks = books.length;
                const availableBooks = books.reduce((sum: number, book: { availableCopies: number }) => sum + (book.availableCopies || 0), 0);
                const borrowedBooks = books.reduce((sum: number, book: { totalCopies: number; availableCopies: number }) =>
                    sum + ((book.totalCopies || 0) - (book.availableCopies || 0)), 0);

                // Fetch borrow records
                const borrowResponse = await api.get('/borrow-records');
                const borrowData = borrowResponse.data?.data || [];
                const borrowRecords = Array.isArray(borrowData) ? borrowData : [];
                const totalBorrowRecords = borrowRecords.length;

                // Calculate overdue books
                const now = new Date();
                const overdueBooks = borrowRecords.filter((record: { dueDate: string; returnDate: string | null }) => {
                    if (record.returnDate) return false;
                    return new Date(record.dueDate) < now;
                }).length;

                // Get unique active members (students who have borrowed)
                const activeMembers = new Set(borrowRecords.map((record: { studentId: string }) => record.studentId)).size;

                setStats({
                    totalBooks,
                    availableBooks,
                    borrowedBooks,
                    overdueBooks,
                    totalBorrowRecords,
                    activeMembers
                });
            } catch (error) {
                console.error('Failed to fetch library statistics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLibraryStats();
    }, []);

    const statCards = [
        {
            title: 'Total Books',
            value: stats.totalBooks,
            icon: BookMarked,
            color: 'bg-blue-500',
            link: '/books'
        },
        {
            title: 'Available Books',
            value: stats.availableBooks,
            icon: BookOpen,
            color: 'bg-green-500',
            link: '/books'
        },
        {
            title: 'Borrowed Books',
            value: stats.borrowedBooks,
            icon: FileText,
            color: 'bg-yellow-500',
            link: '/borrow-records'
        },
        {
            title: 'Overdue Books',
            value: stats.overdueBooks,
            icon: AlertTriangle,
            color: 'bg-red-500',
            link: '/library-management/overdue'
        },
        {
            title: 'Total Borrow Records',
            value: stats.totalBorrowRecords,
            icon: ClipboardList,
            color: 'bg-purple-500',
            link: '/borrow-records'
        },
        {
            title: 'Active Members',
            value: stats.activeMembers,
            icon: Users,
            color: 'bg-indigo-500',
            link: '/borrow-records'
        }
    ];

    const quickActions = [
        {
            title: 'Book Inventory',
            description: 'Manage books and library resources',
            icon: BookOpen,
            link: '/books',
            color: 'bg-blue-600 hover:bg-blue-700'
        },
        {
            title: 'Borrow Records',
            description: 'View and manage borrowing records',
            icon: FileText,
            link: '/borrow-records',
            color: 'bg-green-600 hover:bg-green-700'
        },
        {
            title: 'Borrowing Management',
            description: 'Process new book borrowing requests',
            icon: ClipboardList,
            link: '/library-management/borrowing',
            color: 'bg-yellow-600 hover:bg-yellow-700'
        },
        {
            title: 'Library Reports',
            description: 'Generate and view library reports',
            icon: BarChart3,
            link: '/library-management/reports',
            color: 'bg-purple-600 hover:bg-purple-700'
        },
        {
            title: 'Overdue Management',
            description: 'Track and manage overdue books',
            icon: AlertTriangle,
            link: '/library-management/overdue',
            color: 'bg-red-600 hover:bg-red-700'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-2">
                        <Library className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Library Management Dashboard
                        </h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                        Overview of library operations and quick access to management tools
                    </p>
                </div>

                {/* Statistics Cards */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {statCards.map((stat, index) => {
                                const Icon = stat.icon;
                                return (
                                    <Link
                                        key={index}
                                        to={stat.link}
                                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                                    {stat.title}
                                                </p>
                                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                                    {stat.value}
                                                </p>
                                            </div>
                                            <div className={`${stat.color} p-3 rounded-lg`}>
                                                <Icon className="h-6 w-6 text-white" />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center space-x-2 mb-6">
                                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Quick Actions
                                </h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {quickActions.map((action, index) => {
                                    const Icon = action.icon;
                                    return (
                                        <Link
                                            key={index}
                                            to={action.link}
                                            className={`${action.color} text-white rounded-lg p-4 transition-colors`}
                                        >
                                            <div className="flex items-start space-x-3">
                                                <Icon className="h-6 w-6 flex-shrink-0 mt-1" />
                                                <div>
                                                    <h3 className="font-semibold mb-1">{action.title}</h3>
                                                    <p className="text-sm opacity-90">{action.description}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LibraryManagementDashboard;
