import React, { useState, useEffect } from 'react';
import { X, FileText, Loader2, Eye } from 'lucide-react';
import api from '../../lib/api';
import { generateScheduleReport } from '../../utils/reportGenerator';
import { toast } from 'sonner';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import { useSchoolSettings } from '../../hooks/useSchoolSettings';
import { getSettingValue } from '../../services/settingsService';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

interface Course {
  id: string;
  name: string;
  courseCode: string;
}

interface EmployeeUser {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
}

interface EmployeeRecord {
  id: string;
  employeeId: string;
  user: EmployeeUser;
}

const PrintReportModal: React.FC<PrintReportModalProps> = ({ isOpen, onClose, theme }) => {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedYearLevel, setSelectedYearLevel] = useState('First Year');
  const [semester, setSemester] = useState('First Semester');
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  
  const { academicYear: currentAcademicYear } = useAcademicYear();
  const [academicYear, setAcademicYear] = useState(currentAcademicYear);
  
  const { settings, schoolName, schoolLogo, schoolEmail } = useSchoolSettings();
  const [signatories, setSignatories] = useState({
    endorsedBy: { id: '', name: '', position: '' },
    approvedBy: { id: '', name: '', position: '' }
  });

  useEffect(() => {
    if (currentAcademicYear) {
      setAcademicYear(currentAcademicYear);
    }
  }, [currentAcademicYear]);

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
      fetchEmployees();
    }
  }, [isOpen]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees', { params: { page: 1, limit: 200 } });
      if (!response.data?.success) return;

      const list: EmployeeRecord[] = response.data.data || [];
      const sorted = [...list].sort((a, b) => (a.user?.lastName || '').localeCompare(b.user?.lastName || ''));
      setEmployees(sorted);

      const findByPosition = (predicate: (position: string) => boolean) =>
        sorted.find(e => typeof e.user?.position === 'string' && predicate(e.user.position.toLowerCase()));

      const defaultEndorser =
        findByPosition(p => p.includes('dean')) ||
        findByPosition(p => p.includes('program head')) ||
        sorted[0];

      const defaultApprover =
        findByPosition(p => p.includes('director') && p.includes('academic')) ||
        findByPosition(p => p.includes('director')) ||
        findByPosition(p => p.includes('president')) ||
        sorted[0];

      if (defaultEndorser) {
        setSignatories(prev => ({
          ...prev,
          endorsedBy: {
            id: defaultEndorser.id,
            name: `${defaultEndorser.user.firstName} ${defaultEndorser.user.lastName}`,
            position: defaultEndorser.user.position
          }
        }));
      }

      if (defaultApprover) {
        setSignatories(prev => ({
          ...prev,
          approvedBy: {
            id: defaultApprover.id,
            name: `${defaultApprover.user.firstName} ${defaultApprover.user.lastName}`,
            position: defaultApprover.user.position
          }
        }));
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses?limit=100&isActive=true');
      if (response.data.success) {
        setCourses(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedCourse(response.data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const handleGenerate = async (preview = false) => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }

    setLoading(true);
    try {
      // Fetch schedules with filters
      // We set a high limit to get all schedules for the report
      const response = await api.get('/schedules', {
        params: {
          courseId: selectedCourse,
          yearLevel: selectedYearLevel,
          semester,
          academicYear,
          limit: 1000
        }
      });

      if (response.data.success) {
        const schedules = response.data.data;
        
        if (schedules.length === 0) {
          toast.warning('No schedules found for the selected criteria');
          setLoading(false);
          return;
        }

        const course = courses.find(c => c.id === selectedCourse);
        
        const output = await generateScheduleReport(schedules, {
          courseName: course?.name || 'Unknown Course',
          courseCode: course?.courseCode || 'COURSE',
          semester,
          academicYear,
          yearLevel: selectedYearLevel,
          logoUrl: schoolLogo || '/uploads/logo-1769045130003.jpg',
          schoolName,
          schoolAddress: getSettingValue(settings, 'school_address', ''),
          schoolEmail,
          endorsedBy: signatories.endorsedBy.name,
          endorsedByPosition: signatories.endorsedBy.position,
          approvedBy: signatories.approvedBy.name,
          approvedByPosition: signatories.approvedBy.position
        }, { preview });
        
        if (preview && typeof output === 'string') {
          window.open(output, '_blank');
        } else {
          toast.success('Report generated successfully');
          onClose();
        }
      } else {
        toast.error('Failed to fetch schedules');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('An error occurred while generating the report');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`w-full max-w-md p-6 rounded-lg shadow-xl ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Schedule Report
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Course / Program</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            >
              <option value="">Select Course</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.courseCode} - {course.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Level Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Year Level</label>
            <select
              value={selectedYearLevel}
              onChange={(e) => setSelectedYearLevel(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            >
              <option value="First Year">First Year</option>
              <option value="Second Year">Second Year</option>
              <option value="Third Year">Third Year</option>
              <option value="Fourth Year">Fourth Year</option>
            </select>
          </div>

          {/* Semester Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            >
              <option value="First Semester">First Semester</option>
              <option value="Second Semester">Second Semester</option>
              <option value="Summer">Summer</option>
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium mb-1">Academic Year</label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 2024-2025"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Endorsed By</label>
            <select
              value={signatories.endorsedBy.id}
              onChange={(e) => {
                const selected = employees.find(emp => emp.id === e.target.value);
                setSignatories(prev => ({
                  ...prev,
                  endorsedBy: selected
                    ? {
                        id: selected.id,
                        name: `${selected.user.firstName} ${selected.user.lastName}`,
                        position: selected.user.position
                      }
                    : { id: '', name: '', position: '' }
                }));
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.user.lastName}, {emp.user.firstName} - {emp.user.position}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Approved By</label>
            <select
              value={signatories.approvedBy.id}
              onChange={(e) => {
                const selected = employees.find(emp => emp.id === e.target.value);
                setSignatories(prev => ({
                  ...prev,
                  approvedBy: selected
                    ? {
                        id: selected.id,
                        name: `${selected.user.firstName} ${selected.user.lastName}`,
                        position: selected.user.position
                      }
                    : { id: '', name: '', position: '' }
                }));
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.user.lastName}, {emp.user.firstName} - {emp.user.position}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={() => handleGenerate(true)}
            disabled={loading}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
              theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Preview
          </button>
          <button
            onClick={() => handleGenerate(false)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintReportModal;
