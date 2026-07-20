import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Home,
  Users,
  BookOpen,
  UserCheck,
  CreditCard,
  Book,
  Calendar,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Building2,
  Briefcase,
  ChevronDown,
  User,
  FileText,
  HelpCircle,
  BarChart3,
  Printer,
  Library,
  ClipboardList,
  AlertTriangle,
  FileCheck,
  FolderOpen,
} from 'lucide-react';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { useSettingsContext } from '../utils/settingsUtils';

interface NavigationItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRoles?: string[];
  subItems?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    requiredRoles: ['STUDENT', 'TEACHER', 'LIBRARIAN', 'ADMIN', 'SUPERADMIN', 'STAFF', 'FINANCE', 'REGISTRAR']
  },
  {
    name: 'My Profile',
    path: '/profile',
    icon: User,
    requiredRoles: ['STUDENT', 'TEACHER', 'LIBRARIAN', 'ADMIN', 'SUPERADMIN', 'STAFF', 'FINANCE', 'REGISTRAR']
  },
  {
    name: 'Students',
    path: '/students',
    icon: Users,
    requiredRoles: ['TEACHER', 'ADMIN', 'SUPERADMIN', 'REGISTRAR']
  },
  {
    name: 'Employees',
    path: '/employees',
    icon: Briefcase,
    requiredRoles: ['ADMIN']
  },
  {
    name: 'Courses',
    path: '/courses',
    icon: Book,
    requiredRoles: ['ADMIN', 'SUPERADMIN', 'STUDENT']
  },
  {
    name: 'Subjects',
    path: '/subjects',
    icon: BookOpen,
    requiredRoles: ['ADMIN', 'SUPERADMIN']
  },
  {
    name: 'Enrollments',
    path: '/enrollments',
    icon: UserCheck,
    requiredRoles: ['ADMIN', 'SUPERADMIN', 'REGISTRAR', 'STUDENT']
  },
  {
    name: 'Payments',
    path: '/payments',
    icon: CreditCard,
    requiredRoles: ['ADMIN', 'SUPERADMIN', 'FINANCE']
  },
  {
    name: 'Library Management',
    path: '/library-management',
    icon: Library,
    requiredRoles: ['LIBRARIAN', 'ADMIN', 'SUPERADMIN'],
    subItems: [
      {
        name: 'Book Inventory',
        path: '/books',
        icon: BookOpen,
        requiredRoles: ['LIBRARIAN', 'ADMIN', 'SUPERADMIN']
      },
      {
        name: 'Borrow Records',
        path: '/borrow-records',
        icon: FileText,
        requiredRoles: ['LIBRARIAN', 'ADMIN', 'SUPERADMIN']
      },
      {
        name: 'Borrowing Management',
        path: '/library-management/borrowing',
        icon: ClipboardList,
        requiredRoles: ['LIBRARIAN', 'ADMIN', 'SUPERADMIN']
      },
      {
        name: 'Library Reports',
        path: '/library-management/reports',
        icon: BarChart3,
        requiredRoles: ['LIBRARIAN', 'ADMIN', 'SUPERADMIN']
      },
      {
        name: 'Overdue Management',
        path: '/library-management/overdue',
        icon: AlertTriangle,
        requiredRoles: ['LIBRARIAN', 'ADMIN', 'SUPERADMIN']
      }
    ]
  },
  {
    name: 'Documents',
    path: '/documents',
    icon: FileText,
    requiredRoles: ['ADMIN', 'SUPERADMIN', 'REGISTRAR'],
    subItems: [
      {
        name: 'Dashboard',
        path: '/documents',
        icon: BarChart3,
        requiredRoles: ['ADMIN', 'SUPERADMIN', 'REGISTRAR']
      },
      {
        name: 'Requirements',
        path: '/document-requirements',
        icon: FileCheck,
        requiredRoles: ['ADMIN', 'SUPERADMIN', 'REGISTRAR']
      },
      {
        name: 'Categories',
        path: '/document-categories',
        icon: FolderOpen,
        requiredRoles: ['ADMIN', 'SUPERADMIN', 'REGISTRAR']
      }
    ]
  },
  {
    name: 'Schedules',
    path: '/schedules',
    icon: Calendar,
    requiredRoles: ['TEACHER', 'ADMIN', 'SUPERADMIN', 'REGISTRAR', 'STUDENT']
  },
  {
    name: 'Timetable',
    path: '/timetable',
    icon: Calendar,
    requiredRoles: ['STUDENT', 'TEACHER', 'REGISTRAR', 'LIBRARIAN', 'ADMIN', 'SUPERADMIN']
  },
  {
    name: 'Reports',
    path: '/reports',
    icon: BarChart3,
    requiredRoles: ['ADMIN', 'SUPERADMIN', 'TEACHER', 'FINANCE']
  },
  {
    name: 'PDF Generation',
    path: '/pdf-generation',
    icon: Printer,
    requiredRoles: ['ADMIN', 'SUPERADMIN']
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings,
    requiredRoles: ['ADMIN', 'SUPERADMIN'],
    subItems: [
      {
        name: 'General Settings',
        path: '/settings',
        icon: Settings,
        requiredRoles: ['ADMIN', 'SUPERADMIN']
      },
      {
        name: 'User Management',
        path: '/user-management',
        icon: Users,
        requiredRoles: ['ADMIN', 'SUPERADMIN']
      },
      {
        name: 'Academic Years',
        path: '/academic-years',
        icon: Calendar,
        requiredRoles: ['ADMIN', 'SUPERADMIN']
      },
      {
        name: 'Departments',
        path: '/departments',
        icon: Building2,
        requiredRoles: ['ADMIN', 'SUPERADMIN']
      },
      {
        name: 'Positions',
        path: '/positions',
        icon: Briefcase,
        requiredRoles: ['ADMIN', 'SUPERADMIN']
      },
      {
        name: 'Grade Levels',
        path: '/grade-levels',
        icon: BookOpen,
        requiredRoles: ['ADMIN', 'SUPERADMIN']
      },
      {
        name: 'Sections',
        path: '/settings/sections',
        icon: Users,
        requiredRoles: ['ADMIN', 'SUPERADMIN']
      },
      {
        name: 'Activity Logs',
        path: '/activity-logs',
        icon: ClipboardList,
        requiredRoles: ['ADMIN', 'SUPERADMIN']
      }
    ]
  },
  {
    name: 'Documentation',
    path: '/documentation',
    icon: HelpCircle,
    requiredRoles: ['STUDENT', 'TEACHER', 'REGISTRAR', 'LIBRARIAN', 'FINANCE', 'STAFF', 'ADMIN', 'SUPERADMIN']
  }
];

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { theme: _theme } = useSettingsContext();

  // Check if user has required role for a navigation item
  const hasRequiredRole = (requiredRoles?: string[]): boolean => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (!user?.role) return false;
    const effectiveRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
    if (effectiveRoles.includes('SUPERADMIN')) return true;
    return effectiveRoles.some(role => requiredRoles.includes(role));
  };

  // Filter navigation items based on user role
  const visibleNavigationItems = navigationItems.filter(item =>
    hasRequiredRole(item.requiredRoles)
  );

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    closeMobile();
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-md shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="Toggle mobile menu"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-lg z-40
          transition-all duration-300 ease-in-out flex flex-col
          ${isCollapsed ? 'w-16' : 'w-80'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {!isCollapsed && (
            <h2 className="text-xl font-bold text-gray-800 dark:text-white truncate">
              School Management
            </h2>
          )}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 min-h-0">
          <ul className="space-y-1 px-3">
            {visibleNavigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const isExpanded = expandedItems.has(item.name);
              const hasSubItems = item.subItems && item.subItems.length > 0;

              // Check if any sub-item is active
              const hasActiveSubItem = hasSubItems && item.subItems?.some(subItem =>
                isActive(subItem.path)
              );

              return (
                <li key={item.path}>
                  {hasSubItems ? (
                    <>
                      <div className="flex items-center w-full">
                        <Link
                          to={item.path}
                          onClick={closeMobile}
                          className={`
                            flex items-center flex-1 px-3 py-2.5 rounded-l-lg transition-all duration-200
                            ${active || hasActiveSubItem
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-r-2 border-blue-700 dark:border-blue-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                            }
                            ${isCollapsed ? 'justify-center rounded-lg' : 'justify-start'}
                          `}
                          title={isCollapsed ? item.name : undefined}
                        >
                          <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
                          {!isCollapsed && (
                            <span className="font-medium truncate flex-1 text-left">{item.name}</span>
                          )}
                        </Link>
                        {!isCollapsed && (
                          <button
                            onClick={() => toggleExpanded(item.name)}
                            className={`
                              px-2 py-2.5 rounded-r-lg transition-all duration-200
                              ${active || hasActiveSubItem
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                              }
                            `}
                            title="Toggle submenu"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                                }`}
                            />
                          </button>
                        )}
                      </div>
                      {!isCollapsed && isExpanded && item.subItems && (
                        <ul className="mt-1 space-y-1 ml-6">
                          {item.subItems
                            .filter(subItem => hasRequiredRole(subItem.requiredRoles))
                            .map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = isActive(subItem.path);

                              return (
                                <li key={subItem.path}>
                                  <Link
                                    to={subItem.path}
                                    onClick={closeMobile}
                                    className={`
                                      flex items-center px-3 py-2 rounded-lg transition-all duration-200
                                      ${isSubActive
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-r-2 border-blue-700 dark:border-blue-400'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                      }
                                    `}
                                    title={subItem.name}
                                  >
                                    <SubIcon className="w-4 h-4 mr-3 flex-shrink-0" />
                                    <span className="font-medium truncate">{subItem.name}</span>
                                  </Link>
                                </li>
                              );
                            })
                          }
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={closeMobile}
                      className={`
                        flex items-center px-3 py-2.5 rounded-lg transition-all duration-200
                        ${active
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-r-2 border-blue-700 dark:border-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                        }
                        ${isCollapsed ? 'justify-center' : 'justify-start'}
                      `}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
                      {!isCollapsed && (
                        <span className="font-medium truncate">{item.name}</span>
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info */}
        {user && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
            {!isCollapsed ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.email
                      }
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main Content Spacer */}
      <div className={`hidden lg:block transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-80'}`} />
    </>
  );
};

export default Sidebar;
