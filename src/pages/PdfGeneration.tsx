import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  BookOpen, 
  GraduationCap,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCurrentAcademicYear } from '../hooks/useAcademicYear';

interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  department: {
    name: string;
    code: string;
  };
}

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface SyllabusPreviewData {
  university: string;
  program: string;
  effectiveYear: string;
  totalUnits: number;
  courses: Array<{
    yearLevel: string;
    semester: string;
    subjects: Array<{
      code: string;
      name: string;
      units: number;
      lectureHours: number;
      labHours: number;
      prerequisites: string[];
    }>;
    semesterTotalUnits: number;
    yearTotalUnits: number;
  }>;
}

const PdfGeneration: React.FC = () => {
  const { user } = useAuth();
  const { academicYear: currentAcademicYear, loading: academicYearLoading } = useCurrentAcademicYear();
  const [activeTab, setActiveTab] = useState<'syllabus' | 'prospectus'>('syllabus');
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [previewData, setPreviewData] = useState<SyllabusPreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Check user permissions
  const canGeneratePdf = user?.role === 'ADMIN' || 
                        user?.role === 'REGISTRAR' || 
                        user?.role === 'TEACHER';

  const canGenerateProspectus = user?.role === 'ADMIN' || 
                               user?.role === 'REGISTRAR';

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch courses and departments in parallel
      const [coursesRes, departmentsRes] = await Promise.all([
        api.get('/pdf/courses', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        api.get('/pdf/departments', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      ]);
      setCourses(coursesRes.data.data || coursesRes.data || []);
      setDepartments(departmentsRes.data.data || departmentsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canGeneratePdf) {
      fetchInitialData();
    }
  }, [canGeneratePdf, fetchInitialData]);

  const handlePreview = async () => {
    if (!currentAcademicYear) {
      setError('Academic year not available. Please check your settings.');
      return;
    }

    if (activeTab === 'syllabus' && !selectedCourse) {
      setError('Please select a course');
      return;
    }

    if (activeTab === 'prospectus' && !selectedDepartment) {
      setError('Please select a department');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const endpoint = activeTab === 'syllabus' 
        ? `/pdf/preview/syllabus/${selectedCourse}`
        : `/pdf/preview/prospectus/${selectedDepartment}`;
      const response = await api.get(endpoint, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        params: { academicYear: currentAcademicYear }
      });
      setPreviewData(response.data.data);
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview data');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!currentAcademicYear) {
      setError('Academic year not available. Please check your settings.');
      return;
    }

    if (activeTab === 'syllabus' && !selectedCourse) {
      setError('Please select a course');
      return;
    }

    if (activeTab === 'prospectus' && !selectedDepartment) {
      setError('Please select a department');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const endpoint = activeTab === 'syllabus' 
        ? `/pdf/syllabus/${selectedCourse}`
        : `/pdf/prospectus/${selectedDepartment}`;
      const response = await api.post(endpoint, { academicYear: currentAcademicYear }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const filename = activeTab === 'syllabus' 
        ? `${selectedCourse}_Syllabus_${currentAcademicYear.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        : `${selectedDepartment}_Prospectus_${currentAcademicYear.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`${activeTab === 'syllabus' ? 'Syllabus' : 'Prospectus'} PDF generated successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  if (!canGeneratePdf) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to generate PDF documents.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">PDF Generation</h1>
          <p className="text-gray-600 dark:text-gray-400">Generate academic syllabi and prospectus documents</p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('syllabus')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'syllabus'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300 dark:border-gray-600'
                }`}
              >
                <BookOpen className="inline-block w-4 h-4 mr-2" />
                Course Syllabus
              </button>
              {canGenerateProspectus && (
                <button
                  onClick={() => setActiveTab('prospectus')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'prospectus'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <GraduationCap className="inline-block w-4 h-4 mr-2" />
                  Department Prospectus
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {activeTab === 'syllabus' ? 'Generate Syllabus' : 'Generate Prospectus'}
              </h2>

              {/* Current Academic Year Display */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="inline-block w-4 h-4 mr-1" />
                  Academic Year
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700">
                  {academicYearLoading ? (
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading current academic year...
                    </div>
                  ) : currentAcademicYear ? (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900 dark:text-white font-medium">{currentAcademicYear}</span>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Current</span>
                    </div>
                  ) : (
                    <span className="text-red-500">No academic year set</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Academic year is automatically set from global settings. 
                  <span className="text-blue-600"> Change in Settings if needed.</span>
                </p>
              </div>

              {/* Course/Department Selection */}
              {activeTab === 'syllabus' ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <BookOpen className="inline-block w-4 h-4 mr-1" />
                    Course
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.code}>
                        {course.code} - {course.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Building2 className="inline-block w-4 h-4 mr-1" />
                    Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.code}>
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handlePreview}
                  disabled={loading || academicYearLoading || !currentAcademicYear}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  Preview Data
                </button>

                <button
                  onClick={handleGeneratePdf}
                  disabled={loading || academicYearLoading || !currentAcademicYear}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Generate PDF
                </button>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            {showPreview && previewData ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {activeTab === 'syllabus' ? 'Syllabus Preview' : 'Prospectus Preview'}
                  </h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{previewData.university}</h4>
                    <p className="text-gray-600 dark:text-gray-400">{previewData.program}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Academic Year: {previewData.effectiveYear}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Units: {previewData.totalUnits}</p>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Course Structure</h5>
                    <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-4 rounded font-mono text-sm">
                      {(() => {
                        // Group courses by year level
                        const coursesByYear = previewData.courses.reduce((acc, course) => {
                          if (!acc[course.yearLevel]) {
                            acc[course.yearLevel] = [];
                          }
                          acc[course.yearLevel].push(course);
                          return acc;
                        }, {} as Record<string, typeof previewData.courses>);

                        return Object.entries(coursesByYear).map(([yearLevel, yearCourses]) => {
                          const yearTotalUnits = yearCourses.reduce((sum, course) => sum + course.semesterTotalUnits, 0);
                          
                          return (
                            <div key={yearLevel} className="mb-4">
                              <div className="font-semibold text-gray-900 dark:text-white mb-2">{yearLevel}</div>
                              {yearCourses.map((course, semesterIndex) => (
                                <div key={semesterIndex} className="ml-2 mb-3">
                                  <div className="flex items-center mb-2">
                                    <span className="text-gray-600 dark:text-gray-400 mr-2">├─</span>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{course.semester}</span>
                                  </div>
                                  <div className="ml-6">
                                    <div className="mb-2">
                                      <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-gray-700 dark:text-gray-300 border-b pb-1">
                                        <span>Code</span>
                                        <span>Name</span>
                                        <span>Units</span>
                                      </div>
                                    </div>
                                    {course.subjects.map((subject, subIndex) => (
                                      <div key={subIndex} className="grid grid-cols-3 gap-4 text-xs text-gray-600 dark:text-gray-400 py-1">
                                        <span className="font-medium">{subject.code}</span>
                                        <span>{subject.name}</span>
                                        <span>{subject.units}</span>
                                      </div>
                                    ))}
                                    <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Semester Total: {course.semesterTotalUnits} units
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <div className="ml-2 mt-2 pt-2 border-t border-gray-400">
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {yearLevel} Total: {yearTotalUnits} units
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      <div className="mt-4 pt-4 border-t-2 border-gray-600">
                        <div className="font-bold text-gray-900 dark:text-white">
                          TOTAL UNITS: {previewData.totalUnits}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <FileText className="mx-auto h-12 w-12 mb-4" />
                  <p>Select options and click "Preview Data" to see the content that will be included in your PDF.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfGeneration;
import api from '../lib/api';