import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import {
  BookOpen,
  Edit,
  UserX,
  UserCheck,
  ChevronLeft,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  Archive,
  Calculator,
  Monitor,
  FlaskConical,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { AppDispatch } from '../store';
import {
updateSubject,
  fetchSubjectById,
  clearError,
  selectCurrentSubject,
  selectSubjectsLoading,
  selectSubjectsError,
  selectSubjects,
} from '../store/slices/subjectSlice';
import {
  fetchDepartments,
} from '../store/slices/departmentSlice';
import {
  fetchCourses,
  selectCourses,
} from '../store/slices/courseSlice';
import { PrerequisiteCategory } from '../types/subject.types';
import { toast } from 'sonner';

const SubjectDetails: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const subject = useAppSelector(selectCurrentSubject);
  const isLoading = useAppSelector(selectSubjectsLoading);
  const error = useAppSelector(selectSubjectsError);
  const courses = useAppSelector(selectCourses);
  const subjects = useAppSelector(selectSubjects);


  const [isProcessing, setIsProcessing] = useState(false);

  // Load subject data and departments
  useEffect(() => {
    if (id) {
      dispatch(fetchSubjectById(id));
      dispatch(fetchDepartments({}));
      dispatch(fetchCourses({}));
    }
  }, [id, dispatch]);

  // Handle error display
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Handle toggle subject status
  const handleToggleStatus = async () => {
    if (!id || !subject) return;

    setIsProcessing(true);
    try {
      const newIsActive = !subject.isActive;
      
      await dispatch(updateSubject({ id: subject.id, data: { isActive: newIsActive } })).unwrap();
      
      toast.success(`Subject ${newIsActive ? 'activated' : 'deactivated'} successfully`);
    } catch (_error) {
      console.error('Error updating subject status:', _error);
      toast.error('Failed to update subject status');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'ACTIVE': {
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: CheckCircle,
        text: 'Active'
      },
      'INACTIVE': {
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        icon: Clock,
        text: 'Inactive'
      },
      'ARCHIVED': {
        color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        icon: Archive,
        text: 'Archived'
      }
    };

    const config = statusConfig[status] || statusConfig['ACTIVE'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4" />
        {config.text}
      </span>
    );
  };

  // Get prerequisite subjects
  const getPrerequisiteSubjects = () => {
    if (!subject?.prerequisites || subject.prerequisites.length === 0) {
      return [];
    }
    
    return subject.prerequisites
      .filter(p => p.category === PrerequisiteCategory.REQUIRED || !p.category)
      .map(prereq => {
        const prereqSubject = subjects.find(s => s.id === prereq.prerequisiteId);
        return prereqSubject || { id: prereq.prerequisiteId, name: 'Unknown Subject', code: 'N/A' };
      });
  };

  // Get co-requisite subjects
  const getCoRequisiteSubjects = () => {
    if (!subject?.prerequisites || subject.prerequisites.length === 0) {
      return [];
    }
    
    return subject.prerequisites
      .filter(p => p.category === PrerequisiteCategory.COREQUISITE)
      .map(coreq => {
        const coreqSubject = subjects.find(s => s.id === coreq.prerequisiteId);
        return coreqSubject || { id: coreq.prerequisiteId, name: 'Unknown Subject', code: 'N/A' };
      });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900">
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-2">Subject not found</h3>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">The subject you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/subjects')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Subjects
          </button>
        </div>
      </div>
    );
  }

  const prerequisiteSubjects = getPrerequisiteSubjects();
  const coRequisiteSubjects = getCoRequisiteSubjects();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/subjects')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              {subject.name}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Subject Code: <span className="font-medium">{subject.code}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/subjects/${id}/edit`)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Subject
          </button>
          <button
            onClick={handleToggleStatus}
            disabled={isProcessing}
            className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors shadow-sm text-sm font-medium disabled:opacity-50 ${
              subject.isActive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              subject.isActive ? <UserX className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />
            )}
            {subject.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Subject Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">Subject Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">Subject Name</label>
                  <p className="text-gray-900 dark:text-white dark:text-gray-300 font-medium">{subject.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">Subject Code</label>
                  <p className="text-gray-900 dark:text-white dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 px-2 py-1 rounded inline-block">
                    {subject.code}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">Status</label>
                  {getStatusBadge(subject.isActive ? 'ACTIVE' : 'INACTIVE')}
                </div>
              </div>
              {/* Dweezil's Code - Renamed Course field to Department */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">
                    <GraduationCap className="h-4 w-4 inline mr-1" />
                    Department
                  </label>
                  <p className="text-gray-900 dark:text-white dark:text-gray-300">
                    {subject.department?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Year Level
                  </label>
                  <p className="text-gray-900 dark:text-white dark:text-gray-300">
                    {subject.yearLevel ? `${subject.yearLevel}${['st', 'nd', 'rd'][subject.yearLevel - 1] || 'th'} Year` : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">
                    <Calculator className="h-4 w-4 inline mr-1" />
                    Units
                  </label>
                  <p className="text-gray-900 dark:text-white dark:text-gray-300">{subject.units}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">
                      <Monitor className="h-4 w-4 inline mr-1" />
                      Lecture Hrs
                    </label>
                    <p className="text-gray-900 dark:text-white dark:text-gray-300">{subject.lectureHours}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">
                      <FlaskConical className="h-4 w-4 inline mr-1" />
                      Lab Hrs
                    </label>
                    <p className="text-gray-900 dark:text-white dark:text-gray-300">{subject.labHours}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {subject.description && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Description
              </h2>
              <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 leading-relaxed">{subject.description}</p>
            </div>
          )}

          {/* Prerequisites */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Prerequisites
            </h2>
            {prerequisiteSubjects.length > 0 ? (
              <div className="space-y-3">
                {prerequisiteSubjects.map((prereq, index) => (
                  <div
                    key={`${prereq.id}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white dark:text-gray-300">{prereq.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{prereq.code}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/subjects/${prereq.id}`)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 italic">No prerequisites required for this subject.</p>
            )}
          </div>

          {/* Co-requisites */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-500" />
              Co-requisites
            </h2>
            {coRequisiteSubjects.length > 0 ? (
              <div className="space-y-3">
                {coRequisiteSubjects.map((coreq, index) => (
                  <div
                    key={`${coreq.id}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-300">{coreq.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{coreq.code}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/subjects/${coreq.id}`)}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">No co-requisites required for this subject.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Units
                </span>
                <span className="font-semibold text-gray-900 dark:text-white dark:text-gray-300">
                  {subject.units}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400 flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Lecture Hours
                </span>
                <span className="font-semibold text-gray-900 dark:text-white dark:text-gray-300">{subject.lectureHours}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Lab Hours
                </span>
                <span className="font-semibold text-gray-900 dark:text-white dark:text-gray-300">{subject.labHours}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Total Hours
                </span>
                <span className="font-semibold text-gray-900 dark:text-white dark:text-gray-300">
                  {subject.lectureHours + subject.labHours}
                </span>
              </div>
              {/* Dweezil's Code - Renamed Course field to Department in Quick Stats */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Department
                </span>
                <span className="font-semibold text-gray-900 dark:text-white dark:text-gray-300">
                  {subject.department?.name || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Prerequisites
                </span>
                <span className="font-semibold text-gray-900 dark:text-white dark:text-gray-300">
                  {prerequisiteSubjects.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Co-requisites
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-300">
                  {coRequisiteSubjects.length}
                </span>
              </div>
            </div>
          </div>

          {/* Subject Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white mb-4">Subject Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Created</label>
                <p className="text-gray-900 dark:text-white dark:text-gray-300">
                  {subject.createdAt ? new Date(subject.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Last Updated</label>
                <p className="text-gray-900 dark:text-white dark:text-gray-300">
                  {subject.updatedAt ? new Date(subject.updatedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Subject ID</label>
                <p className="text-gray-900 dark:text-white dark:text-gray-300 font-mono text-sm break-all">{subject.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectDetails;