import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import { BrandingContext } from '../contexts/BrandingContextDefinition';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Save,
  User,
  GraduationCap,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  FileText,
  CheckCircle,
  Upload,
  Download,
  Trash2,
  File,
  Users,
  Phone,
  Heart,
  X,
  BookOpen,
  Settings
} from 'lucide-react';
import {
  updateStudent,
  fetchStudentById,
  selectCurrentStudent,
  selectStudentLoading,
  selectStudentError,
  clearError,
  clearCurrentStudent,
  type UpdateStudentData
} from '../store/slices/studentSlice';
import { selectUser } from '../store/slices/authSlice';
import type { AppDispatch } from '../store';
import { resolveApiBaseUrl } from '../lib/api';
import { useSettingsContext } from '../utils/settingsUtils';

// Circular Progress Avatar Component
interface CircularProgressAvatarProps {
  progress: number; // 0-100
  status: 'idle' | 'uploading' | 'success' | 'error';
  fileName?: string;
  size?: number;
}

const CircularProgressAvatar: React.FC<CircularProgressAvatarProps> = ({ 
  progress, 
  status, 
  fileName,
  size = 48 
}) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getStatusColor = () => {
    switch (status) {
      case 'uploading': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'uploading': return '#3B82F6'; // blue-600
      case 'success': return '#10B981'; // green-600
      case 'error': return '#EF4444'; // red-600
      default: return '#9CA3AF'; // gray-400
    }
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Background circle */}
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth="3"
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getProgressColor()}
          strokeWidth="3"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {status === 'uploading' ? (
          <div className="flex flex-col items-center">
            <FileText className={`h-4 w-4 ${getStatusColor()}`} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
              {progress}%
            </span>
      
    </div>
        ) : status === 'success' ? (
          <CheckCircle className={`h-6 w-6 ${getStatusColor()}`} />
        ) : status === 'error' ? (
          <AlertCircle className={`h-6 w-6 ${getStatusColor()}`} />
        ) : (
          <FileText className={`h-5 w-5 ${getStatusColor()}`} />
        )}
      </div>
      
      {/* File name tooltip */}
      {fileName && status === 'uploading' && (
        <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg">
          {fileName.length > 20 ? `${fileName.substring(0, 20)}...` : fileName}
        </div>
      )}
      
      {/* Status message for success/error */}
      {(status === 'success' || status === 'error') && (
        <div className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium whitespace-nowrap z-10 ${
          status === 'success' ? 'text-green-600' : 'text-red-600'
        }`}>
          {status === 'success' ? 'Uploaded!' : 'Failed'}
        </div>
      )}
    </div>
  );
};

// Document requirement interface - updated to match API response
interface DocumentRequirement {
  id?: string;
  type: string;
  name: string;
  description?: string;
  required: boolean;
  submitted: boolean;
  submittedDate?: Date;
  notes?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  pendingFile?: File;
  categoryId?: string;
  validationRules?: {
    maxFileSize?: number;
    allowedFileTypes?: string[];
    requiresVerification?: boolean;
  };
  applicableGradeLevels?: string[];
  expirationDays?: number;
  studentDocumentId?: string;
  isInitial?: boolean;
}

// Upload progress interface
interface UploadProgress {
  isUploading: boolean;
  progress: number; // 0-100
  status: 'idle' | 'uploading' | 'success' | 'error';
  fileName?: string;
}

interface StudentUserSearchResult {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  middleInitial?: string | null;
  isActive?: boolean;
  student?: { id: string } | null;
}

/**
 * StudentForm component for creating and editing student records
 * Features: form validation, user creation, student data management
 */
const StudentForm: React.FC = () => {
  const { theme } = useSettingsContext();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const currentStudent = useSelector(selectCurrentStudent);
  const isLoading = useSelector(selectStudentLoading);
  const error = useSelector(selectStudentError);
  const _currentUser = useSelector(selectUser);

  // Form state
  const [formData, setFormData] = useState({
    // User data
    firstName: '',
    lastName: '',
    middleInitial: '',
    email: '',
    phoneNumber: '',
    address: '',
    dateOfBirth: '',
    gender: 'OTHER' as 'MALE' | 'FEMALE' | 'OTHER',
    password: '',
    confirmPassword: '',
    username: '', // Dweezil's Code - Added username field for Issue #5
    // Student specific data
    studentId: '',
    gradeLevel: '',
    courseId: '', // Added course field
    enrollmentDate: (() => {
      // Dweezil's Code - Get current date in local timezone to avoid day-before issue
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(), // Default to current date in local timezone
    registrationStatus: 'PRE_REGISTERED' as 'PRE_REGISTERED' | 'REGISTERED' | 'WITHDRAWN',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    emergencyContact: '',
    emergencyPhone: '',
    medicalInfo: '',
    notes: '',
    registrationNotes: '' // Dweezil's Code - Added for Issue #4: Remarks field in pre-registration
  });

  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingStudentId, setIsGeneratingStudentId] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<'pre-registration' | 'full-registration'>('pre-registration');
  const [courses, setCourses] = useState<Array<{id: string, courseCode: string, name: string}>>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<StudentUserSearchResult[]>([]);
  const [isUserSearchLoading, setIsUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StudentUserSearchResult | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  // Dweezil's Code - Added selectedSubjects to enrollment type for displaying submitted subjects
  const [studentEnrollments, setStudentEnrollments] = useState<Array<{id: string, courseId: string, status: string, enrollmentDate: string, course: {id: string, name: string, courseCode: string}, selectedSubjects?: string[]}>>([]);
  const [gradeLevelTouched, setGradeLevelTouched] = useState(false);
  const [allSubjects, setAllSubjects] = useState<Array<{id: string, name: string, code: string, units: number}>>([]);
  const studentIdAutoGenerateKeyRef = useRef<string>('');

  // Grade levels state
  const [gradeLevels, setGradeLevels] = useState<Array<{id: string, name: string}>>([]);

  // Preview modal state
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string; fileName?: string; fileType?: string; isObjectUrl?: boolean } | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);

  // Default required documents for pre-registration
  const DEFAULT_REQUIRED_DOCUMENTS = useMemo((): DocumentRequirement[] => [
    {
      id: 'temp-birth-certificate',
      type: 'birth_certificate',
      name: 'Birth Certificate',
      required: true,
      submitted: false
    },
    {
      id: 'temp-previous-school-records',
      type: 'previous_school_records',
      name: 'Previous School Records/Transcript',
      required: true,
      submitted: false
    },
    {
      id: 'temp-medical-records',
      type: 'medical_records',
      name: 'Medical Certificate/Health Records',
      required: true,
      submitted: false
    },
    {
      id: 'temp-id-copy',
      type: 'id_copy',
      name: 'Parent/Guardian ID Copy',
      required: true,
      submitted: false
    },
    {
      id: 'temp-proof-of-address',
      type: 'proof_of_address',
      name: 'Proof of Address',
      required: true,
      submitted: false
    },
    {
      id: 'temp-passport-photo',
      type: 'passport_photo',
      name: 'Passport-size Photos',
      required: true,
      submitted: false
    },
    {
      id: 'temp-immunization-records',
      type: 'immunization_records',
      name: 'Immunization Records',
      required: false,
      submitted: false
    },
    {
      id: 'temp-emergency-contact',
      type: 'emergency_contact',
      name: 'Emergency Contact Information',
      required: true,
      submitted: false
    }
  ], []);

  // Document tracking state
  const [documentsRequired, setDocumentsRequired] = useState<DocumentRequirement[]>(isEditing ? [] : DEFAULT_REQUIRED_DOCUMENTS);
  const [documentsSubmitted, setDocumentsSubmitted] = useState<DocumentRequirement[]>([]);
  const [, setPreRegRequirements] = useState<DocumentRequirement[]>([]);

  // Merge two requirement lists, preferring entries with file/status info
  const mergeRequirements = useCallback((base: DocumentRequirement[], extras: DocumentRequirement[]): DocumentRequirement[] => {
    const byId = new Map<string, DocumentRequirement>();

    const put = (doc: DocumentRequirement) => {
      const key = doc.id || doc.type;
      const existing = key ? byId.get(key) : undefined;
      if (!existing) {
        if (key) byId.set(key, doc);
        return;
      }
      const merged: DocumentRequirement = {
        ...existing,
        ...doc,
        submitted: existing.submitted || doc.submitted || false,
        submittedDate: existing.submittedDate || doc.submittedDate,
        fileUrl: doc.fileUrl || existing.fileUrl,
        fileName: doc.fileName || existing.fileName,
        fileSize: doc.fileSize || existing.fileSize,
        notes: doc.notes || existing.notes,
        studentDocumentId: doc.studentDocumentId || existing.studentDocumentId
      };
      if (key) byId.set(key, merged);
    };

    base.forEach(put);
    extras.forEach(put);
    return Array.from(byId.values());
  }, []);

  // Fetch pre-registration requirements
  useEffect(() => {
        const fetchPreRegReqs = async () => {
      try {
        const API_BASE_URL = resolveApiBaseUrl();
        const res = await fetch(`${API_BASE_URL}/public/pre-listing/requirements`);
        if (res.ok) {
           const data = await res.json();
           if (data.success && Array.isArray(data.data)) {
             // Transform to DocumentRequirement
            const reqs = data.data.map((r: { id: string; type: string; name: string; description?: string; required: boolean; group: string }) => ({
              id: r.id,
              type: r.type,
              name: r.name,
              description: r.description,
              required: r.required,
              submitted: false,
              categoryId: r.group,
              isInitial: true
            }));
            setPreRegRequirements(reqs);
            
            // Also update main list if not editing
            if (!isEditing) {
              setDocumentsRequired(prev => mergeRequirements(prev, reqs));
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch pre-reg requirements', e);
      }
    };
    fetchPreRegReqs();
  }, [isEditing, mergeRequirements]);

  const branding = useContext(BrandingContext);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const PRE_REGISTRATION_GROUPS = useMemo(() => [
    { 
      id: 'freshmen', 
      label: 'For currently enrolled Grade 12 (SHS) students', 
      description: 'Please upload a photocopy of your First Semester Report Card for S.Y. 2025–2026 AND your Certificate of Enrollment (CoE) for the Second Semester of S.Y. 2025–2026.' 
    },
    { 
      id: 'grade12', 
      label: 'For SHS graduates from previous school years who have not yet enrolled in higher education', 
      description: 'Please upload a photocopy of your complete Grade 12 (SHS) Report Card for both the First and Second Semesters.' 
    },
    { 
      id: 'als', 
      label: 'For ALS (Alternative Learning System) Senior High School Level Passers', 
      description: 'Please upload a photocopy of your Certificate of Rating (COR) for the Senior High School (SHS) level of the Accreditation and Equivalency (A&E) Test.' 
    },
    {
      id: 'transferee',
      label: 'For Transferees / Returning Students',
      description: 'Please upload a photocopy of your Transcript of Records (TOR) / Informative Copy of Grades. (Certificate of Transfer Credential / Honorable Dismissal is optional).'
    }
  ], []);

  // Update documents when category changes in pre-registration mode
  useEffect(() => {
    if (registrationMode === 'pre-registration') {
      if (isEditing && !selectedCategory && documentsRequired.length > 0) {
        return;
      }

      if (!selectedCategory) {
        return;
      }

      const getRequirementsForCategory = (category: string): DocumentRequirement[] => {
        const allReqs = [
          {
            id: 'bc0b899c-0180-4835-9c13-1f638f2c1b8d',
            type: 'first_sem_grade_fresh_2025_2026',
            name: 'Photocopy of First Semester Report Card (S.Y. 2025–2026)',
            description: 'First Semester Report Card for S.Y. 2025–2026',
            required: true,
            submitted: false,
            group: 'freshmen'
          },
          {
            id: 'bff481dd-7ddd-41ad-b4f3-c34033e72cb7',
            type: 'coe_second_sem_fresh_2025_2026',
            name: 'Certificate of Enrollment (CoE) for Second Semester (S.Y. 2025–2026)',
            description: 'Certificate of Enrollment (CoE) for the Second Semester of S.Y. 2025–2026',
            required: true,
            submitted: false,
            group: 'freshmen'
          },
          {
            id: 'a997fc62-17c8-43aa-b788-d2e0f1575117',
            type: 'grade12_report_card',
            name: 'Photocopy of Complete Grade 12 Report Card (First & Second Semesters)',
            description: 'Complete Grade 12 (SHS) Report Card for both the First and Second Semesters',
            required: true,
            submitted: false,
            group: 'grade12'
          },
          {
            id: 'd0c09f95-40fb-66dd-e0bb-959383808440',
            type: 'als_certificate',
            name: 'Photocopy of Certificate of Rating (COR) - SHS Level A&E Test',
            description: 'Certificate of Rating (COR) for the Senior High School (SHS) level of the Accreditation and Equivalency (A&E) Test',
            required: true,
            submitted: false,
            group: 'als'
          },
          {
            id: 'e1d1a906-51ac-77ee-f1cc-a6a494919551',
            type: 'transferee_tor',
            name: 'Photocopy of Transcript of Records (TOR) or Informative Copy of Grades',
            description: 'Transcript of Records (TOR) or Informative Copy of Grades from previous school',
            required: true,
            submitted: false,
            group: 'transferee'
          },
          {
            id: 'f2e2a917-62ad-88ff-f2dd-a7a595020662',
            type: 'transferee_hd',
            name: 'Certificate of Transfer Credential / Honorable Dismissal',
            description: 'Certificate of Transfer Credential or Honorable Dismissal from previous school',
            required: false,
            submitted: false,
            group: 'transferee'
          }
        ];

        return allReqs
          .filter(r => r.group === category)
          .map(r => ({
            ...r,
            submitted: false,
            categoryId: r.group,
            isInitial: true
          }));
      };

      const newReqs = getRequirementsForCategory(selectedCategory);

      if (isEditing) {
        setDocumentsRequired(prev => {
          const merged = mergeRequirements(newReqs, prev);
          const validKeys = new Set(newReqs.map(d => d.id || d.type));
          return merged.filter(d => {
            const key = d.id || d.type;
            return !key || validKeys.has(key);
          });
        });
      } else {
        setDocumentsRequired(newReqs);
      }
    }
  }, [selectedCategory, registrationMode, isEditing, documentsRequired.length, mergeRequirements]);

  const downloadPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    const headerText = 'Benedict College, Alicia, Bohol, Philippines';

    if (branding?.logoUrl) {
      try {
        const logoBlob = await fetch(branding.logoUrl).then(r => r.blob());
        const logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(logoBlob);
        });
        const logoW = 24;
        const logoH = 24;
        doc.addImage(logoDataUrl, 'PNG', 14, y, logoW, logoH);
      } catch { /* noop */ }
    }

    doc.setFontSize(16);
    doc.text(headerText, pageWidth / 2, y + 8, { align: 'center' });
    y += 30;

    doc.setFontSize(14);
    doc.text('Student Pre-Registration Details', 14, y); y += 8;
    doc.setFontSize(11);
    
    doc.text(`Name: ${formData.firstName} ${formData.lastName}`, 14, y); y += 6;
    doc.text(`Email: ${formData.email}`, 14, y); y += 6;
    doc.text(`Birth Date: ${formData.dateOfBirth}`, 14, y); y += 6;
    doc.text(`Gender: ${formData.gender}`, 14, y); y += 6;
    if (formData.address) {
      const addrLines = doc.splitTextToSize(`Address: ${formData.address}`, 180);
      doc.text(addrLines, 14, y);
      y += addrLines.length * 6;
    }
    if (formData.phoneNumber) { doc.text(`Phone: ${formData.phoneNumber}`, 14, y); y += 6; }
    if (formData.notes) {
      doc.text(`Remarks:`, 14, y);
      y += 6;
      const lines = doc.splitTextToSize(formData.notes, 180);
      doc.text(lines, 14, y);
      y += (lines.length * 6) + 4;
    }
    y += 4;
    doc.text('Requirements:', 14, y); y += 6;
    
    for (const r of documentsRequired) {
      doc.text(`• ${r.name}${r.submitted ? ' (submitted)' : ''}`, 18, y); y += 6;
    }
    
    doc.setFontSize(10);
    doc.text('info@benedictcollege.com', pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.save(`pre-registration-${formData.lastName}.pdf`);
  };
  
  // Upload progress tracking state
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});

  // Dweezil's Code - Registration status options - dynamically filtered based on current student status
  // Issue #11: Admin/Registrar can set any status
  const getRegistrationStatusOptions = () => {
    const baseOptions = [
      { value: 'PRE_REGISTERED', label: 'Pre-Registered' },
      { value: 'REGISTERED', label: 'Registered' },
      { value: 'WITHDRAWN', label: 'Withdrawn' }
    ];

    // Dweezil's Code - For new students in Full Registration mode, only show REGISTERED
    if (!isEditing && registrationMode === 'full-registration') {
      return [{ value: 'REGISTERED', label: 'Registered' }];
    }

    // Dweezil's Code - For new students in Pre-Registration mode, only show PRE_REGISTERED
    if (!isEditing && registrationMode === 'pre-registration') {
      return [{ value: 'PRE_REGISTERED', label: 'Pre-Registered' }];
    }

    if (isEditing && currentStudent?.registrationStatus) {
      const currentStatus = currentStudent.registrationStatus;
      
      if (currentStatus === 'PRE_REGISTERED') {
        return baseOptions.filter(option => 
          option.value === 'PRE_REGISTERED' || option.value === 'REGISTERED' || option.value === 'WITHDRAWN'
        );
      } else if (currentStatus === 'REGISTERED') {
        return baseOptions.filter(option => 
          option.value === 'REGISTERED' || option.value === 'WITHDRAWN'
        );
      } else if (currentStatus === 'WITHDRAWN') {
        return baseOptions.filter(option => option.value === 'WITHDRAWN');
      }
    }

    return baseOptions;
  };

  // Function to fetch student enrollments
  const fetchStudentEnrollments = async (studentId: string) => {
    try {
      const API_BASE_URL = resolveApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/enrollments/student/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const enrollmentsData = await response.json();
        setStudentEnrollments(enrollmentsData.data || []);
        return enrollmentsData.data || [];
      } else {
        console.warn('Failed to fetch student enrollments');
        setStudentEnrollments([]);
        return [];
      }
    } catch (error) {
      console.error('Error fetching student enrollments:', error);
      setStudentEnrollments([]);
      return [];
    }
  };

  // Function to fetch all subjects for mapping IDs to names
  const fetchAllSubjects = useCallback(async (studentId?: string) => {
    try {
      const API_BASE_URL = resolveApiBaseUrl();
      // If studentId is provided, fetch subjects available for that student
      // Otherwise fetch all active subjects
      const url = studentId 
        ? `${API_BASE_URL}/subjects/student/${studentId}/available`
        : `${API_BASE_URL}/subjects?isActive=true&limit=1000`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAllSubjects(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, []);

  // Fetch subjects when student ID changes
  useEffect(() => {
    if (id) {
      fetchAllSubjects(id);
    }
  }, [id, fetchAllSubjects]);

  // Function to fetch document requirements for registration
  const fetchDocumentRequirements = useCallback(async (_gradeLevel?: string) => {
    try {
      const API_BASE_URL = resolveApiBaseUrl();
      const params = new URLSearchParams();
      
      // Don't filter by grade level - fetch ALL requirements including Initial Requirements
      // This ensures Initial Requirements are always visible regardless of grade level selection
      
      const response = await fetch(`${API_BASE_URL}/document-requirements/for-registration?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const requirementsData = await response.json();
        const requirements = requirementsData.data?.flat || [];
        
        // Ensure requirements is an array before mapping
        if (!Array.isArray(requirements)) {
          console.warn('Document requirements data is not an array');
          setDocumentsRequired([]);
          return [];
        }
        
        // Convert API response to local format
        const formattedRequirements: DocumentRequirement[] = requirements.map((req: {
          id: string;
          name: string;
          description?: string;
          isRequired: boolean;
          isInitial?: boolean;
          categoryId?: string;
          validationRules?: {
            maxFileSize?: number;
            allowedFileTypes?: string[];
            requiresVerification?: boolean;
          };
          applicableGradeLevels?: string[];
          expirationDays?: number;
        }) => ({
          id: req.id,
          type: req.name.toLowerCase().replace(/[^a-z0-9]/g, '_'), // Generate type from name
          name: req.name,
          description: req.description,
          required: req.isRequired,
          submitted: false,
          isInitial: req.isInitial || false, // Dweezil's Code - Preserve isInitial flag from API
          categoryId: req.categoryId,
          validationRules: req.validationRules,
          applicableGradeLevels: req.applicableGradeLevels,
          expirationDays: req.expirationDays
        }));
        
        setDocumentsRequired(formattedRequirements);
        return formattedRequirements;
      } else {
        console.warn('Failed to fetch document requirements');
        setDocumentsRequired([]);
        return [];
      }
    } catch (error) {
      console.error('Error fetching document requirements:', error);
      setDocumentsRequired([]);
      return [];
    }
  }, []);

  // Function to fetch existing student documents
  const fetchStudentDocuments = useCallback(async (studentId: string, studentRegistrationStatus?: string) => {
    try {
      const API_BASE_URL = resolveApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/student-documents/student/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const documentsData = await response.json();
        const documents = documentsData.data || [];
        
        console.log('📄 Fetched documents from API:', documents.length);
        console.log('📋 Current requirements:', documentsRequired.length);
        console.log('📋 Student registration status:', studentRegistrationStatus || formData.registrationStatus);
        
        // Dweezil's Code - Track which documents have been matched to prevent duplicates
        const matchedDocumentIds = new Set<string>();
        
        // Dweezil's Code - Merge uploaded documents with requirements
        // Always merge uploaded docs with existing requirements to preserve the full list
        
        setDocumentsRequired(prev => {
          console.log('🔄 Updating requirements, prev count:', prev.length);
          
          // Dweezil's Code - Enhanced document matching with better logging and duplicate prevention
          const updatedReqs = prev.map(req => {
            const submittedDoc = documents.find((doc: {
              id: string;
              requirement?: {
                id: string;
                name: string;
              };
              fileUrl?: string;
              fileName?: string;
              fileSize?: number;
              submittedDate?: string;
              notes?: string;
              status?: string;
              submittedAt?: string;
              filePath?: string;
              isInitial?: boolean;
            }) => {
              // Dweezil's Code - Skip if this document has already been matched to another requirement
              if (matchedDocumentIds.has(doc.id)) {
                return false;
              }
              
              // Match by requirement ID or normalized name
              const matches = doc.requirement?.id === req.id || 
                (doc.requirement?.name && req.name && 
                 doc.requirement.name.toLowerCase() === req.name.toLowerCase()) ||
                doc.requirement?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') === req.type;
              
              if (matches) {
                console.log(`✅ Match found: ${req.name} (Req ID: ${req.id}, Doc ID: ${doc.id})`);
                // Dweezil's Code - Mark this document as matched to prevent duplicate matching
                matchedDocumentIds.add(doc.id);
              }
              
              return matches;
            });
            
            if (submittedDoc) {
              // Use the document's isInitial flag from the database to preserve whether
              // it was uploaded during pre-registration (isInitial: true) or full registration (isInitial: false)
              const docIsInitial = submittedDoc.isInitial ?? req.isInitial;
              console.log(`📝 Marking as submitted: ${req.name} Status: ${submittedDoc.status} isInitial: ${docIsInitial}`);
              return {
                ...req,
                submitted: submittedDoc.status === 'SUBMITTED' || submittedDoc.status === 'submitted' || submittedDoc.status === 'verified' || submittedDoc.status === 'approved' || submittedDoc.status === 'pending',
                submittedDate: submittedDoc.submittedAt ? new Date(submittedDoc.submittedAt) : undefined,
                fileUrl: submittedDoc.fileUrl || submittedDoc.filePath,
                fileName: submittedDoc.fileName,
                fileSize: submittedDoc.fileSize,
                notes: `Status: ${submittedDoc.status}`,
                studentDocumentId: submittedDoc.id,
                // Use the document's isInitial flag to preserve upload context
                isInitial: docIsInitial
              };
            }
            
            return req;
          });
          
          console.log('📄 Updated requirements:', updatedReqs.length);
          return updatedReqs;
        });
        
        return documents;
      } else {
        console.warn('Failed to fetch student documents');
        return [];
      }
    } catch (error) {
      console.error('Error fetching student documents:', error);
      return [];
    }
    // Dweezil's Code - Removed documentsRequired.length from dependency array to prevent race condition
    // The function should only re-run when registration status changes, not when requirements update
  }, [formData.registrationStatus]);

  // Load student data for editing
  useEffect(() => {
    if (isEditing && id) {
      dispatch(fetchStudentById(id));
      // Also fetch student enrollments
      fetchStudentEnrollments(id);
    }
    
    return () => {
      dispatch(clearCurrentStudent());
      dispatch(clearError());
      setStudentEnrollments([]);
    };
  }, [dispatch, isEditing, id]);

  // Populate form when student data is loaded
  useEffect(() => {
    if (isEditing && currentStudent) {
      // Dweezil's Code - Issue #4: Debug log to check what data we're receiving
      console.log('🔍 StudentForm - currentStudent data:', {
        id: currentStudent.id,
        registrationNotes: currentStudent.registrationNotes,
        notes: currentStudent.notes,
        fullData: currentStudent
      });
      
      setGradeLevelTouched(false);
      // Dweezil's Code - Issue #9: Extract year level from gradeLevel.name, don't default to Second Year
      // For pre-registered students, always set to empty string
      const yearLevel = currentStudent.registrationStatus === 'PRE_REGISTERED' 
        ? '' 
        : (currentStudent.gradeLevel?.name || ''); // Empty string if no grade level assigned
      
      // Dweezil's Code - Extract courseId from student record or enrollments
      // Priority: 1) Student's courseId field, 2) Most recent enrollment
      let courseId = currentStudent.courseId || ''; // Start with student's direct courseId
      
      // If no direct courseId, try to get from enrollments
      if (!courseId && studentEnrollments.length > 0) {
        // Find the most recent active enrollment
        const activeEnrollments = studentEnrollments.filter(enrollment => 
          enrollment.status === 'ENROLLED' || enrollment.status === 'ACTIVE'
        );
        
        if (activeEnrollments.length > 0) {
          // Sort by enrollment date (most recent first) and get the courseId
          const sortedEnrollments = activeEnrollments.sort((a, b) => 
            new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime()
          );
          courseId = sortedEnrollments[0].courseId;
        } else if (studentEnrollments.length > 0) {
          // If no active enrollments, use the most recent one
          const sortedEnrollments = studentEnrollments.sort((a, b) => 
            new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime()
          );
          courseId = sortedEnrollments[0].courseId;
        }
      }
      
      setFormData({
        firstName: currentStudent.user?.firstName || '',
        lastName: currentStudent.user?.lastName || '',
        middleInitial: currentStudent.user?.middleInitial || '',
        email: currentStudent.user?.email || '',
        // Only pre-populate username if student is REGISTERED or higher (has an account)
        username: (currentStudent.registrationStatus !== 'PRE_REGISTERED' && currentStudent.user?.username) ? currentStudent.user.username : '',
        phoneNumber: currentStudent.phoneNumber || currentStudent.user?.phone || '',
        address: currentStudent.address || '',
        dateOfBirth: currentStudent.dateOfBirth ? 
          new Date(currentStudent.dateOfBirth).toISOString().split('T')[0] : '',
        gender: (currentStudent.gender || 'OTHER') as 'MALE' | 'FEMALE' | 'OTHER',
        password: '',
        confirmPassword: '',
        studentId: currentStudent.studentId || '',
        gradeLevel: yearLevel,
        courseId: courseId,
        enrollmentDate: currentStudent.enrollmentDate ? 
          new Date(currentStudent.enrollmentDate).toISOString().split('T')[0] : '',
        registrationStatus: currentStudent.registrationStatus || 'PRE_REGISTERED',
        parentName: currentStudent.guardianName || '',
        parentPhone: currentStudent.guardianPhone || '',
        parentEmail: currentStudent.guardianEmail || '',
        emergencyContact: currentStudent.emergencyContact || '',
        emergencyPhone: currentStudent.emergencyPhone || '',
        medicalInfo: currentStudent.medicalInfo || '',
        notes: currentStudent.notes || '',
        // Dweezil's Code - Fix Issue #4: Load registrationNotes for Remarks field
        registrationNotes: currentStudent.registrationNotes || ''
      });
      
      // Set registration mode based on student status
      // Dweezil's Code - Issue #1: Always use full-registration mode when editing
      // For enrolled students, automatically set to full-registration and lock it
      setRegistrationMode('full-registration');

      if (currentStudent.documentsSubmitted) {
        setDocumentsSubmitted(currentStudent.documentsSubmitted);
      }

      // Dweezil's Code - Only populate documentsRequired from currentStudent for PRE_REGISTERED students
      // For REGISTERED students, the initial load useEffect will fetch all requirements from API
      if (Array.isArray(currentStudent.documentsRequired) && currentStudent.documentsRequired.length > 0 && 
          currentStudent.registrationStatus === 'PRE_REGISTERED') {
        const baseReqs = currentStudent.documentsRequired as unknown as DocumentRequirement[];

        const submittedExtras: DocumentRequirement[] = Array.isArray(currentStudent.documentsSubmitted)
          ? (currentStudent.documentsSubmitted as unknown as Array<{
              id?: string;
              type?: string;
              name: string;
              description?: string;
              required?: boolean;
              fileUrl?: string;
              filePath?: string;
              fileName?: string;
              fileSize?: number;
              submitted?: boolean;
              submittedAt?: string;
              submittedDate?: string;
              notes?: string;
            }>).map(doc => ({
              id: doc.id,
              type: doc.type || doc.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              name: doc.name,
              description: doc.description,
              required: false,  // Dweezil's Code - Make initial requirements optional in full-registration mode
              submitted: doc.submitted ?? true,
              submittedDate: doc.submittedDate
                ? new Date(doc.submittedDate)
                : doc.submittedAt
                  ? new Date(doc.submittedAt)
                  : undefined,
              fileUrl: doc.fileUrl || doc.filePath,
              fileName: doc.fileName,
              fileSize: doc.fileSize,
              notes: doc.notes,
              isInitial: true
            }))
          : [];

        const mergedReqs = mergeRequirements(baseReqs, submittedExtras);
        
        // Extract and store initial requirements in separate state
        // Dweezil's Code - Make initial requirements optional in full-registration mode
        const initialDocs = mergedReqs.filter(d => d.isInitial === true).map(doc => ({
          ...doc,
          required: false  // Make initial requirements optional
        }));
        console.log('🔍 StudentForm - Storing initial requirements:', initialDocs.length, initialDocs.map(d => ({ name: d.name, isInitial: d.isInitial, required: d.required })));
        setInitialRequirements(initialDocs);
        
        // Dweezil's Code - Don't set documentsRequired here for editing mode
        // Let the initial load useEffect handle it to ensure ALL requirements are loaded
        if (!isEditing) {
          setDocumentsRequired(mergedReqs);
        }

        if (currentStudent.registrationStatus === 'PRE_REGISTERED') {
          const hasDocument = (id: string, type: string) => {
            return currentStudent.documentsRequired?.some(d => d.id === id || d.type === type);
          };

          let inferredCategory: string | null = null;

          if (hasDocument('prelist-als-cert', 'als_certificate')) {
            inferredCategory = 'als';
          } else if (hasDocument('prelist-transferee-tor', 'transferee_tor')) {
            inferredCategory = 'transferee';
          } else if (hasDocument('prelist-grade12-card', 'grade12_report_card')) {
            inferredCategory = 'grade12';
          } else if (hasDocument('prelist-freshmen-grade', 'first_sem_grade_fresh_2025_2026')) {
            inferredCategory = 'freshmen';
          }

          if (inferredCategory) {
            setSelectedCategory(inferredCategory);
          }
        }
      } else if (currentStudent.registrationStatus === 'REGISTERED' && Array.isArray(currentStudent.documentsRequired) && currentStudent.documentsRequired.length > 0) {
        // Dweezil's Code - For REGISTERED students, only store initial requirements
        // The full requirements list will be loaded by the initial load useEffect
        const baseReqs = currentStudent.documentsRequired as unknown as DocumentRequirement[];
        const initialDocs = baseReqs.filter(d => d.isInitial === true).map(doc => ({
          ...doc,
          required: false  // Make initial requirements optional
        }));
        console.log('🔍 StudentForm - Storing initial requirements:', initialDocs.length, initialDocs.map(d => ({ name: d.name, isInitial: d.isInitial, required: d.required })));
        setInitialRequirements(initialDocs);
      }
    }
  }, [currentStudent, isEditing, studentEnrollments, mergeRequirements]);

  // Fetch courses and grade levels for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_BASE_URL = resolveApiBaseUrl();
        
        // Fetch courses
        const coursesResponse = await fetch(`${API_BASE_URL}/courses?limit=100`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();
          setCourses(coursesData.data || []);
        }

        // Fetch grade levels from API
        const gradeLevelsResponse = await fetch(`${API_BASE_URL}/grade-levels`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (gradeLevelsResponse.ok) {
          const gradeLevelsData = await gradeLevelsResponse.json();
          setGradeLevels(gradeLevelsData.data || []);
        } else {
          // Fallback to hardcoded values if API fails
          setGradeLevels([
            { id: 'first-year', name: 'First Year' },
            { id: 'second-year', name: 'Second Year' },
            { id: 'third-year', name: 'Third Year' },
            { id: 'fourth-year', name: 'Fourth Year' }
          ]);
        }

        // Fetch document requirements for registration
        if (!isEditing && registrationMode === 'full-registration') {
          await fetchDocumentRequirements();
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [fetchDocumentRequirements, isEditing, registrationMode]);

  // Store initial requirements separately to prevent them from being lost
  const [initialRequirements, setInitialRequirements] = useState<DocumentRequirement[]>([]);

  // Dweezil's Code - When editing, fetch requirements AND student documents
  // For PRE_REGISTERED: Show uploaded initial docs + all required docs
  // For REGISTERED: Show only uploaded docs
  const initialLoadDone = useRef(false);
  
  useEffect(() => {
    // Dweezil's Code - Wait for currentStudent to load before processing documents
    if (isEditing && registrationMode === 'full-registration' && id && currentStudent && !initialLoadDone.current) {
      initialLoadDone.current = true;
      
      const run = async () => {
        console.log('🔄 Initial load: Fetching for editing, status:', currentStudent.registrationStatus);
        
        // Fetch all requirements first
        const reqs = await fetchDocumentRequirements();
        const baseReqs = Array.isArray(reqs) ? (reqs as DocumentRequirement[]) : [];
        
        // Preserve isInitial flag from API
        const requirementsWithFlags = baseReqs.map(req => ({
          ...req,
          isInitial: req.isInitial || false
        }));
        
        console.log('📋 Setting', requirementsWithFlags.length, 'requirements from API');
        console.log('📋 Initial Requirements:', requirementsWithFlags.filter(r => r.isInitial).length);
        console.log('📋 Required Documents:', requirementsWithFlags.filter(r => !r.isInitial).length);
        
        // Dweezil's Code - Fetch and match documents inline (same as StudentDetails.tsx)
        try {
          const API_BASE_URL = resolveApiBaseUrl();
          const response = await fetch(`${API_BASE_URL}/student-documents/student/${id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const documentsData = await response.json();
            const documents = documentsData.data || [];
            
            console.log('📄 Fetched documents from API:', documents.length);
            console.log('📋 Current requirements:', requirementsWithFlags.length);
            console.log('📋 Student registration status:', currentStudent.registrationStatus);
            
            // Dweezil's Code - Track which documents have been matched to prevent duplicates
            const matchedDocumentIds = new Set<string>();
            
            // Match documents with requirements IN MEMORY
            const finalRequirements = requirementsWithFlags.map(req => {
              const submittedDoc = documents.find((doc: any) => {
                // Skip if already matched
                if (matchedDocumentIds.has(doc.id)) {
                  return false;
                }
                
                // Match by requirement ID or normalized name
                const matches = doc.requirement?.id === req.id || 
                  (doc.requirement?.name && req.name && 
                   doc.requirement.name.toLowerCase() === req.name.toLowerCase()) ||
                  doc.requirement?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') === req.type;
                
                if (matches) {
                  console.log(`✅ Match found: ${req.name} (Req ID: ${req.id}, Doc ID: ${doc.id})`);
                  matchedDocumentIds.add(doc.id);
                }
                
                return matches;
              });
              
              if (submittedDoc) {
                const docIsInitial = submittedDoc.isInitial ?? req.isInitial;
                console.log(`📝 Marking as submitted: ${req.name} Status: ${submittedDoc.status} isInitial: ${docIsInitial}`);
                return {
                  ...req,
                  submitted: submittedDoc.status === 'SUBMITTED' || submittedDoc.status === 'submitted' || submittedDoc.status === 'verified' || submittedDoc.status === 'approved' || submittedDoc.status === 'pending',
                  submittedDate: submittedDoc.submittedAt ? new Date(submittedDoc.submittedAt) : undefined,
                  fileUrl: submittedDoc.fileUrl || submittedDoc.filePath,
                  fileName: submittedDoc.fileName,
                  fileSize: submittedDoc.fileSize,
                  notes: `Status: ${submittedDoc.status}`,
                  studentDocumentId: submittedDoc.id,
                  isInitial: docIsInitial
                };
              }
              
              return req;
            });
            
            console.log('📄 Final requirements:', finalRequirements.length);
            // Set state ONCE with final merged data
            setDocumentsRequired(finalRequirements);
          } else {
            // No documents found, just use requirements
            setDocumentsRequired(requirementsWithFlags);
          }
        } catch (error) {
          console.error('Error fetching student documents:', error);
          // On error, just use requirements
          setDocumentsRequired(requirementsWithFlags);
        }
        
        // Log final state after merge
        setTimeout(() => {
          console.log('📋 FINAL STATE - Total requirements:', documentsRequired.length);
          console.log('📋 FINAL STATE - Initial requirements:', documentsRequired.filter(d => d.isInitial).length);
          console.log('📋 FINAL STATE - Required documents:', documentsRequired.filter(d => !d.isInitial).length);
        }, 100);
      };
      run();
    }
  }, [isEditing, registrationMode, id, currentStudent]); // Dweezil's Code - Removed function dependencies to prevent infinite re-renders

  // Dweezil's Code - Issue #2: Update document requirements when grade level changes
  // Merge new requirements with existing ones instead of replacing
  useEffect(() => {
    // Dweezil's Code - Skip for PRE_REGISTERED students - they already have their requirements loaded
    // Also skip during initial load when editing (let the initial load useEffect handle it)
    if (registrationMode === 'full-registration' && formData.gradeLevel && formData.registrationStatus !== 'PRE_REGISTERED') {
      if (isEditing && (!gradeLevelTouched || !initialLoadDone.current)) return;
      
      const updateDocuments = async () => {
        console.log('📋 Grade level changed, updating documents. Grade:', formData.gradeLevel);
        console.log('📋 Initial requirements in separate state:', initialRequirements.length, initialRequirements.map(d => ({ name: d.name, isInitial: d.isInitial })));
        
        // Fetch new requirements for the selected grade level
        const allReqs = await fetchDocumentRequirements(formData.gradeLevel);
        
        // Dweezil's Code - Filter out Initial Requirements (isInitial: true)
        // Only keep Required Documents (isInitial: false) for full registration
        const newReqs = Array.isArray(allReqs) ? allReqs.filter(req => req.isInitial !== true) : [];
        
        console.log('📋 Fetched new requirements (Required Documents only):', newReqs.length);
        
        // Merge with existing documents to preserve uploaded files and initial requirements
        setDocumentsRequired(prev => {
          console.log('📋 Current documentsRequired:', prev.length, 'with isInitial:', prev.filter(d => d.isInitial).length);
          
          // ALWAYS use the separate initialRequirements state, not prev.filter
          // This ensures we never lose initial requirements
          // Dweezil's Code - Make initial requirements optional in full-registration mode
          const initialDocs = (initialRequirements.length > 0 ? initialRequirements : prev.filter(d => d.isInitial === true))
            .map(doc => ({
              ...doc,
              required: false  // Make initial requirements optional in full-registration mode
            }));
          
          console.log('📋 Using initial docs:', initialDocs.length, initialDocs.map(d => ({ name: d.name, isInitial: d.isInitial, required: d.required })));
          
          // Keep ALL existing documents that have been submitted or have files (excluding initial docs)
          // This ensures uploaded documents are always displayed regardless of grade level
          const existingWithFiles = prev.filter(doc => 
            doc.isInitial !== true && (doc.submitted || doc.fileUrl || doc.pendingFile || doc.studentDocumentId)
          );
          
          console.log('📋 Existing with files:', existingWithFiles.length);
          
          // Add new requirements that don't exist yet
          // Dweezil's Code - All new requirements are already filtered to isInitial: false
          const existingIds = new Set([...initialDocs, ...existingWithFiles].map(d => d.id || d.type));
          const newDocsToAdd = newReqs
            .filter((newDoc: DocumentRequirement) => !existingIds.has(newDoc.id || newDoc.type));
          
          console.log('📋 New docs to add:', newDocsToAdd.length);
          
          const result = [...initialDocs, ...existingWithFiles, ...newDocsToAdd];
          console.log('📋 Final documentsRequired:', result.length, 'Initial docs:', result.filter(d => d.isInitial).length, 'Required docs:', result.filter(d => !d.isInitial).length);
          
          // Return initial docs first, then existing with files, then new docs
          return result;
        });
      };
      
      updateDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.gradeLevel, formData.registrationStatus, gradeLevelTouched, isEditing, registrationMode]);

  // Dweezil's Code - Removed redundant useEffect that was causing duplicate fetchStudentDocuments calls
  // The main useEffect at line 1074 already handles fetching student documents when editing

  // Dweezil's Code - Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const nextValue =
      !isEditing && (name === 'firstName' || name === 'lastName' || name === 'middleInitial')
        ? value.toUpperCase()
        : value;

    if (!isEditing && registrationMode === 'pre-registration') {
      if (name === 'email') setEmailTouched(true);
      if (name === 'username') setUsernameTouched(true);
      if (name === 'password') setPasswordTouched(true);
    }

    if (name === 'gradeLevel') {
      setGradeLevelTouched(true);
    }
    
    // Update form data
    setFormData(prev => {
      const newData = { ...prev, [name]: nextValue };
      
      if (name === 'registrationStatus' && value === 'REGISTERED' && !newData.enrollmentDate) {
        newData.enrollmentDate = new Date().toISOString().split('T')[0];
      }
      
      return newData;
    });
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setUserSearchQuery('');
    setUserSearchResults([]);
    setEmailTouched(false);
    setUsernameTouched(false);
    setPasswordTouched(false);
    setFormData(prev => ({
      ...prev,
      firstName: '',
      lastName: '',
      middleInitial: '',
      email: '',
      username: '',
      password: 'Asdf.1234',
      confirmPassword: ''
    }));
  };

  const selectExistingUser = (user: StudentUserSearchResult) => {
    setSelectedUser(user);
    setUserSearchQuery(`${user.lastName}, ${user.firstName}`);
    setUserSearchResults([]);
    setEmailTouched(true);
    setUsernameTouched(true);
    setPasswordTouched(true);
    setFormData(prev => ({
      ...prev,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      middleInitial: user.middleInitial || '',
      email: user.email || '',
      username: user.username || '',
      password: '',
      confirmPassword: ''
    }));
  };

  useEffect(() => {
    if (isEditing) return;
    if (registrationMode !== 'pre-registration') return;
    if (selectedUser) return;

    const sanitize = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    const derivedEmail = (() => {
      const ln = sanitize(formData.lastName);
      return ln ? `${ln}@email.com` : '';
    })();
    const derivedUsername = (() => {
      const ln = sanitize(formData.lastName);
      const fi = sanitize(formData.firstName).slice(0, 1);
      const u = `${fi}${ln}`;
      return u.length >= 3 ? u : '';
    })();

    setFormData(prev => {
      let next = prev;

      if (!emailTouched && derivedEmail && prev.email !== derivedEmail) {
        next = { ...next, email: derivedEmail };
      }

      if (!usernameTouched && derivedUsername && prev.username !== derivedUsername) {
        next = { ...next, username: derivedUsername };
      }

      if (!passwordTouched && !prev.password) {
        next = { ...next, password: 'Asdf.1234' };
      }

      return next;
    });
  }, [
    emailTouched,
    formData.firstName,
    formData.lastName,
    isEditing,
    passwordTouched,
    registrationMode,
    selectedUser,
    usernameTouched
  ]);

  useEffect(() => {
    if (isEditing) return;
    if (registrationMode !== 'pre-registration') return;
    if (selectedUser) return;

    const q = userSearchQuery.trim();
    if (q.length < 2) {
      setUserSearchResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsUserSearchLoading(true);
        const API_BASE_URL = resolveApiBaseUrl();
        const response = await fetch(
          `${API_BASE_URL}/users/students/search?q=${encodeURIComponent(q)}&limit=20&includeWithStudent=true`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          if (!cancelled) setUserSearchResults([]);
          return;
        }

        const data = (await response.json()) as { success: boolean; data: StudentUserSearchResult[] };
        if (!cancelled) setUserSearchResults(Array.isArray(data?.data) ? data.data : []);
      } finally {
        if (!cancelled) setIsUserSearchLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isEditing, registrationMode, selectedUser, userSearchQuery]);

  // Dweezil's Code - Auto-generate Student ID when program is selected or status changes to REGISTERED
  useEffect(() => {
    // Only auto-generate in full-registration mode
    if (registrationMode !== 'full-registration') return;
    
    // Only auto-generate when status is REGISTERED or higher
    if (formData.registrationStatus !== 'REGISTERED') return;
    
    // Need a course selected to generate ID
    if (!formData.courseId) return;
    
    // Don't trigger if already generating
    if (isGeneratingStudentId) return;

    // Generate a key based on status and course
    const nextKey = `${formData.registrationStatus}:${formData.courseId}`;
    
    // If the key changed (different course selected), allow regeneration
    const keyChanged = studentIdAutoGenerateKeyRef.current !== nextKey;
    
    // Auto-generate if:
    // 1. No student ID exists yet, OR
    // 2. The course changed (key changed) and we're not editing an existing student with a saved ID
    const shouldGenerate = !formData.studentId || (keyChanged && !currentStudent?.studentId);
    
    if (shouldGenerate) {
      studentIdAutoGenerateKeyRef.current = nextKey;
      console.log('🆔 Auto-generating Student ID for course:', formData.courseId, 'Key changed:', keyChanged);
      void generateStudentId();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.courseId, formData.registrationStatus, formData.studentId, isGeneratingStudentId, registrationMode]);

  /*
  // Handle document checkbox changes
  const _handleDocumentChange = (docId: string, checked: boolean) => {
    setDocumentsRequired(prev => 
      prev.map((doc) => 
        doc.id === docId 
          ? { ...doc, submitted: checked, submittedDate: checked ? new Date() : undefined }
          : doc
      )
    );
  };
  */

  // Handle document file upload with progress tracking
  const handleDocumentUpload = async (docId: string, file: File) => {
    console.log('🔄 Starting document upload for docId:', docId, 'file:', file.name);
    console.log('📋 All documents:', documentsRequired.map(d => ({ id: d.id, type: d.type, name: d.name })));
    
    // Helper to update error state
    const setError = (message: string) => {
      setDocumentsRequired(prev => prev.map(d => d.id === docId ? { ...d, error: message } : d));
    };

    // Helper function to handle upload errors
    const handleUploadError = (message: string) => {
      console.error('❌ Upload error for document:', docId, 'Message:', message);
      setError(message);
      
      setUploadProgress(prev => ({
        ...prev,
        [docId]: {
          ...prev[docId],
          status: 'error',
          isUploading: false
        }
      }));

      // Clear error progress after 5 seconds
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[docId];
          return newProgress;
        });
      }, 5000);
    };

    // Clear previous error
    setDocumentsRequired(prev => prev.map(d => d.id === docId ? { ...d, error: undefined } : d));

    // File validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'bytes. Max:', maxSize);
      setError('File size must be less than 10MB');
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      console.error('❌ Invalid file type:', file.type);
      setError('Only PDF, JPEG, PNG, DOC, and DOCX files are allowed');
      return;
    }

    console.log('✅ File validation passed. Size:', file.size, 'Type:', file.type);

    // Find document requirement - search by ID first, then by type as fallback
    const documentRequirement = documentsRequired.find(d => d.id === docId || d.type === docId);
    if (!documentRequirement) {
      console.error('❌ Document requirement not found:', docId);
      console.error('❌ Available documents:', documentsRequired.map(d => ({ id: d.id, type: d.type, name: d.name })));
      // alert('Error: Document requirement not found. Please refresh the page and try again.');
      return;
    }

    if (!documentRequirement.id || !isValidRequirementId(documentRequirement.id)) {
      console.error('❌ Document requirement ID is missing or invalid:', documentRequirement);
      console.error('❌ Document ID:', documentRequirement.id, 'Is valid:', isValidRequirementId(documentRequirement.id));
      setError('Configuration error: Missing or invalid requirement ID');
      return;
    }

    if (!id) {
      toast.error('Create the student first, then upload documents from the Edit Student page.');
      return;
    }

    // Authentication and role validation
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No authentication token found');
      alert('Authentication required. Please log in again.');
      return;
    }

    console.log('✅ Document requirement validation passed. ID:', documentRequirement.id);

    // Initialize upload progress
    setUploadProgress(prev => ({
      ...prev,
      [docId]: {
        isUploading: true,
        progress: 0,
        status: 'uploading',
        fileName: file.name
      }
    }));

    const formData = new FormData();
    formData.append('document', file); 
    formData.append('requirementId', documentRequirement.id.toString());
    formData.append('studentId', id);
    // Dweezil's Code - Preserve the isInitial flag from the document requirement
    // Documents from Initial Requirements section should keep isInitial: true
    // Documents from Required Documents section should have isInitial: false
    formData.append('isInitial', documentRequirement.isInitial ? 'true' : 'false');

    console.log('📤 Preparing upload request:', {
      studentId: id,
      requirementId: documentRequirement.id,
      documentType: documentRequirement.type,
      fileName: file.name,
      fileSize: file.size
    });

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          console.log('📊 Upload progress:', progress + '%');
          setUploadProgress(prev => ({
            ...prev,
            [docId]: {
              ...prev[docId],
              progress,
              status: 'uploading'
            }
          }));
        }
      });

      // Handle successful upload
      xhr.addEventListener('load', () => {
        console.log('📡 Upload response received. Status:', xhr.status);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log('✅ Upload successful:', result);
            
            // Update progress to success
            setUploadProgress(prev => ({
              ...prev,
              [docId]: {
                ...prev[docId],
                progress: 100,
                status: 'success',
                isUploading: false
              }
            }));

            // Update the document as submitted with file info
            setDocumentsRequired(prev => 
              prev.map(doc => 
                doc.id === docId 
                  ? { 
                      ...doc, 
                      submitted: true, 
                      submittedDate: new Date(),
                      notes: `File: ${file.name}`,
                      fileUrl: result.data?.fileUrl,
                      fileName: result.data?.fileName || file.name,
                      fileSize: result.data?.fileSize || file.size,
                      studentDocumentId: result.data?.id,
                      error: undefined
                    }
                  : doc
              )
            );

            // Clear progress after 2 seconds
            setTimeout(() => {
              setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[docId];
                return newProgress;
              });
            }, 2000);

            resolve();
          } catch (error) {
            console.error('❌ Error parsing response:', error, 'Raw response:', xhr.responseText);
            handleUploadError('Invalid response from server');
            reject(error);
          }
        } else {
          console.error('❌ Upload failed with status:', xhr.status, 'Response:', xhr.responseText);
          
          let errorMessage = `Upload failed (Status: ${xhr.status})`;
          
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.message || errorMessage;
            
            // Provide specific error messages for common issues
            if (xhr.status === 401) {
              errorMessage = 'Authentication failed. Please log in again.';
            } else if (xhr.status === 403) {
              errorMessage = 'Access denied. You do not have permission to upload documents.';
            } else if (xhr.status === 404) {
              errorMessage = 'Student not found or upload endpoint not available.';
            } else if (xhr.status === 413) {
              errorMessage = 'File too large. Please choose a smaller file.';
            } else if (xhr.status >= 500) {
              errorMessage = 'Server error. Please try again later or contact support.';
            }
          } catch {
            // Use default error message if response is not JSON
          }
          
          handleUploadError(errorMessage);
          reject(new Error(errorMessage));
        }
      });

      // Handle upload errors
      xhr.addEventListener('error', () => {
        console.error('❌ Network error during upload');
        handleUploadError('Network error occurred during upload. Please check your connection and try again.');
        reject(new Error('Network error'));
      });

      // Handle upload abort
      xhr.addEventListener('abort', () => {
        console.warn('⚠️ Upload was cancelled');
        handleUploadError('Upload was cancelled');
        reject(new Error('Upload cancelled'));
      });

      // Set up the request
      const API_BASE_URL = resolveApiBaseUrl();
      const uploadUrl = `${API_BASE_URL}/student-documents/upload`;
      
      console.log('🌐 Opening upload request to:', uploadUrl);
      console.log('🔑 Using token:', token ? 'Present' : 'Missing');
      
      xhr.open('POST', uploadUrl);
      
      // Set headers
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      // Don't set Content-Type header - let the browser set it with boundary for FormData
      console.log('📤 Sending upload request...');
      
      // Send the request
      xhr.send(formData);
    });
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFullFileUrl = (path: string | undefined) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    let baseUrl = 'http://localhost:3001';

    const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
    if (envApiUrl) {
      try {
        if (envApiUrl.startsWith('http')) {
          const url = new URL(envApiUrl);
          baseUrl = url.origin;
        }
      } catch (_e) {
        void _e;
      }
    } else if (import.meta.env.PROD) {
      baseUrl = 'https://api.benedictcollege.com';
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  };

  const getStudentDocumentAccess = async (studentDocumentId: string) => {
    const API_BASE_URL = resolveApiBaseUrl();
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE_URL}/student-documents/${studentDocumentId}/signed-url`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || 'Failed to get document URL');
    }

    const payload = await response.json();
    return payload?.data as
      | { url: string; fileName?: string; fileType?: string; requiresAuthDownload?: boolean }
      | undefined;
  };

  const fetchLocalStudentDocumentBlobUrl = async (studentDocumentId: string) => {
    const API_BASE_URL = resolveApiBaseUrl();
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE_URL}/student-documents/${studentDocumentId}/download`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || 'Failed to download document');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    lastObjectUrlRef.current = objectUrl;
    return objectUrl;
  };

  const openStudentDocument = async (doc: DocumentRequirement, mode: 'preview' | 'download') => {
    try {
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }

      const studentDocumentId = doc.studentDocumentId;
      const name = doc.notes?.replace('File: ', '') || doc.fileName || doc.name;
      const fileName = doc.fileName;
      const fileType = (doc as unknown as { fileType?: string }).fileType;

      if (!studentDocumentId) {
        const url = getFullFileUrl(doc.fileUrl);
        if (!url) return;
        if (mode === 'preview') {
          setPreviewImage({ url, name, fileName, fileType });
        } else {
          window.open(url, '_blank');
        }
        return;
      }

      const access = await getStudentDocumentAccess(studentDocumentId);
      if (!access?.url) return;

      let url = access.url;
      let isObjectUrl = false;

      if (access.requiresAuthDownload) {
        url = await fetchLocalStudentDocumentBlobUrl(studentDocumentId);
        isObjectUrl = true;
      }

      const effectiveFileName = access.fileName || fileName;
      const effectiveFileType = access.fileType || fileType;

      if (mode === 'preview') {
        setPreviewImage({ url, name, fileName: effectiveFileName, fileType: effectiveFileType, isObjectUrl });
        return;
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = effectiveFileName || name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to open document:', error);
      alert(error instanceof Error ? error.message : 'Failed to open document');
    }
  };

  // Validate requirement IDs (only enable upload for real DB UUIDs)
  const isValidRequirementId = useCallback((id?: string) => {
    if (!id) return false;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
  }, []);

  // Handle document deletion
  const handleDocumentDelete = async (index: number) => {
    if (!id) return;

    const document = documentsRequired[index];
    if (!document.studentDocumentId) {
      alert('No document to delete');
      return;
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const API_BASE_URL = resolveApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/student-documents/${document.studentDocumentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update the document as not submitted
        setDocumentsRequired(prev => 
          prev.map((doc, i) => 
            i === index 
              ? { 
                  ...doc, 
                  submitted: false, 
                  submittedDate: undefined,
                  notes: undefined,
                  fileUrl: undefined,
                  fileName: undefined,
                  fileSize: undefined,
                  studentDocumentId: undefined
                }
              : doc
          )
        );
        alert('Document deleted successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete document: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document. Please try again.');
    }
  };

  // Calculate document completion progress
  const _getDocumentProgress = () => {
    const requiredDocs = documentsRequired.filter(doc => doc.required);
    const submittedRequiredDocs = requiredDocs.filter(doc => doc.submitted);
    return {
      completed: submittedRequiredDocs.length,
      total: requiredDocs.length,
      percentage: requiredDocs.length > 0 ? Math.round((submittedRequiredDocs.length / requiredDocs.length) * 100) : 0
    };
  };

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Basic required fields
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    
    // Date of birth and gender are required for both pre-registration and full registration
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    }
    if (!formData.gender) {
      errors.gender = 'Gender is required';
    }
    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    }

    // Additional required fields for full registration
    if (registrationMode === 'full-registration') {
      if (!formData.studentId.trim()) errors.studentId = 'Student ID is required';
      if (!formData.gradeLevel.trim()) errors.gradeLevel = 'Year level is required';
      if (!formData.courseId.trim()) errors.courseId = 'Program is required';
      if (!formData.enrollmentDate) errors.enrollmentDate = 'Enrollment date is required';
      
      // Dweezil's Code - Removed document validation for full registration
      // Documents are now optional when creating students via full registration
      // Admins can create students without requiring all documents to be uploaded first
      // Documents can be uploaded later via the student edit page
    }

    // Pre-registration validation
    if (registrationMode === 'pre-registration') {
      if (!selectedCategory && !isEditing) {
        // Force category selection for new pre-registrations
        // We can't easily show an error on the category selection itself, but we can alert or show a general error
        errors.submit = 'Please select a student category to view requirements.';
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    const needsPasswordValidation = !isEditing && registrationMode === 'full-registration';
    
    if (needsPasswordValidation) {
      // Dweezil's Code - Issue #8: Username is always required when status is REGISTERED or higher
      if (!formData.username || !formData.username.trim()) {
        errors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
      }
      
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }
      
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    // Phone number validation
    const phoneRegex = /^[\d\s\-+()]+$/;
    if (formData.phoneNumber && !phoneRegex.test(formData.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }
    if (formData.parentPhone && !phoneRegex.test(formData.parentPhone)) {
      errors.parentPhone = 'Please enter a valid phone number';
    }
    if (formData.emergencyPhone && !phoneRegex.test(formData.emergencyPhone)) {
      errors.emergencyPhone = 'Please enter a valid phone number';
    }

    // Parent email validation
    if (formData.parentEmail && !emailRegex.test(formData.parentEmail)) {
      errors.parentEmail = 'Please enter a valid email address';
    }

    // Date validation (only validate if dates are provided)
    const today = new Date();
    
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      if (birthDate >= today) {
        errors.dateOfBirth = 'Date of birth must be in the past';
      }
    }
    
    // Dweezil's Code - Fix enrollment date validation to use local timezone
    if (formData.enrollmentDate) {
      const enrollmentDate = new Date(formData.enrollmentDate);
      // Create today's date at start of day in local timezone for fair comparison
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const enrollmentStart = new Date(enrollmentDate.getFullYear(), enrollmentDate.getMonth(), enrollmentDate.getDate());
      
      if (enrollmentStart > todayStart) {
        errors.enrollmentDate = 'Enrollment date cannot be in the future';
      }
    }

    // Registration status validation - prevent invalid status combinations
    if (isEditing && currentStudent?.status === 'ENROLLED') {
      // Enrolled students cannot be changed back to pre-registration
      if (formData.registrationStatus === 'PRE_REGISTERED') {
        errors.status = 'Enrolled students cannot be changed back to pre-registration status';
      }
      
      // Enrolled students must use full registration mode
      if (registrationMode === 'pre-registration') {
        errors.registrationMode = 'Enrolled students must use full registration mode';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please complete the required fields.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (isEditing && id) {
        // Update existing student
        // Find the grade level ID based on the selected name
        const selectedGradeLevel = gradeLevels.find(gl => gl.name === formData.gradeLevel);
        
        // Use the registrationStatus directly from form data
        const registrationStatus = formData.registrationStatus;
        
        // Dweezil's Code - Issue #9: For pre-registered students, set gradeLevelId to null
        // Pre-registered students should not have a grade level assigned yet
        const gradeLevelId = formData.registrationStatus === 'PRE_REGISTERED' 
          ? null 
          : (selectedGradeLevel?.id || null);
        
        const updateData: UpdateStudentData = {
          studentId: formData.studentId,
          gradeLevelId: gradeLevelId,
          // Dweezil's Code - Task 14: Include courseId in student update
          courseId: formData.courseId || undefined,
          enrollmentDate: formData.enrollmentDate,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          address: formData.address,
          phoneNumber: formData.phoneNumber || undefined,
          status: 'PRE_REGISTERED',
          registrationStatus: registrationStatus,
          guardianName: formData.parentName || undefined,
          guardianPhone: formData.parentPhone || undefined,
          guardianEmail: formData.parentEmail || undefined,
          emergencyContact: formData.emergencyContact || undefined,
          emergencyPhone: formData.emergencyPhone || undefined,
          medicalInfo: formData.medicalInfo || undefined,
          notes: formData.notes || undefined,
          // Dweezil's Code - Fix Issue #4: Save registrationNotes (Remarks field)
          registrationNotes: formData.registrationNotes || undefined
          // Dweezil's Code - Don't send documentsRequired/documentsSubmitted
          // These are now managed via the student_documents table
        };
        
        console.log('🚀 Attempting to update student with data:', updateData);
        console.log('📋 Student ID:', id);
        console.log('📋 Registration Status:', updateData.registrationStatus);
        
        await dispatch(updateStudent({ studentId: id, studentData: updateData })).unwrap();
        
        console.log('✅ Student update successful!');
        
      } else {
        // Create new student
        // First, create the user if needed (for new registrations)
        let userId = currentStudent?.user?.id; // If editing existing student
        let _result: { data: { id: string; studentId: string } };
        
        // Define API_BASE_URL for use throughout the student creation process
        const API_BASE_URL = resolveApiBaseUrl();
        
        if (registrationMode === 'pre-registration') {
          // For pre-registration, don't create user separately - the pre-registration endpoint handles it
          const createData = {
            userId: selectedUser?.id,
            firstName: formData.firstName,
            lastName: formData.lastName,
            middleInitial: formData.middleInitial || undefined,
            email: formData.email,
            username: formData.username || undefined,
            password: formData.password || undefined,
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender || 'OTHER',
            address: formData.address,
            phoneNumber: formData.phoneNumber || undefined,
            guardianName: formData.parentName || undefined,
            guardianPhone: formData.parentPhone || undefined,
            guardianEmail: formData.parentEmail || undefined,
            emergencyContact: formData.emergencyContact || undefined,
            emergencyPhone: formData.emergencyPhone || undefined,
            medicalInfo: formData.medicalInfo || undefined,
            // Dweezil's Code - Issue #4: Include registrationNotes in pre-registration
            registrationNotes: formData.registrationNotes || undefined,
            documentsRequired: documentsRequired
              .filter(doc => (selectedCategory ? (doc.categoryId ? doc.categoryId === selectedCategory : true) : true))
              .map(doc => ({
                id: doc.id,
                type: doc.type,
                name: doc.name,
                required: doc.required,
                submitted: doc.submitted,
                categoryId: doc.categoryId,
                isInitial: doc.isInitial,
                notes: doc.notes
              }))
          };
          
          // Call the pre-registration endpoint
          const response = await fetch(`${API_BASE_URL}/students/pre-register`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(createData)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to pre-register student');
          }
          
          _result = await response.json();

          // Handle pending document uploads for new pre-registration
          const pendingDocs = documentsRequired.filter(doc => doc.pendingFile);
          if (pendingDocs.length > 0) {
            console.log(`Uploading ${pendingDocs.length} pending documents for new student ${_result.data.id}`);
            
            const uploadPromises = pendingDocs.map(async (doc) => {
              if (!doc.pendingFile || !doc.id) return;
              
              const formData = new FormData();
              formData.append('document', doc.pendingFile);
              formData.append('requirementId', doc.id);
              formData.append('studentId', _result.data.id);
              formData.append('isInitial', doc.isInitial === false ? 'false' : 'true');
              
              try {
                const uploadResponse = await fetch(`${API_BASE_URL}/student-documents/upload`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: formData
                });
                
                if (!uploadResponse.ok) {
                  const errorData = await uploadResponse.json();
                  console.error(`Failed to upload ${doc.name}:`, errorData);
                  // Don't throw here, let other uploads proceed
                } else {
                  console.log(`Successfully uploaded ${doc.name}`);
                }
              } catch (error) {
                console.error(`Error uploading ${doc.name}:`, error);
              }
            });
            
            await Promise.all(uploadPromises);
          }
        } else {
          // Full registration - create user first if needed
          if (!userId) {
            // Dweezil's Code - Create new user for full registration with username (Issue #5)
            // Use the password from the form
            const userPassword = formData.password || 'TempPass123!';
            
            const userData = {
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              username: formData.username || formData.email.split('@')[0], // Use provided username or generate from email
              password: userPassword, // Use password from form
              role: 'STUDENT'
            };
            
            // Create user via public registration API
            const userResponse = await fetch(`${API_BASE_URL}/auth/register`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(userData)
            });
            
            if (!userResponse.ok) {
              const errorData = await userResponse.json();
              throw new Error(errorData.message || 'Failed to create user account');
            }
            
            const userResult = await userResponse.json();
            userId = userResult.data.user.id;

            // Dweezil's Code - Send email notification with credentials (Issue #3 & #5)
            // Note: Email is now sent automatically by backend when registrationStatus is REGISTERED
            console.log('✅ User created successfully, email will be sent by backend');
          }
          
          // Find the grade level ID based on the selected name
          const selectedGradeLevel = gradeLevels.find(gl => gl.name === formData.gradeLevel);
          
          // Dweezil's Code - Set correct registrationStatus and status for Full Registration
          // Full Registration creates a complete student record but does NOT enroll them yet
          // registrationStatus: REGISTERED means all information is complete and account is activated
          // status: PRE_REGISTERED means student is not yet enrolled in courses (enrollment is separate)
          const createData = {
            userId,
            studentId: formData.studentId,
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender || 'OTHER',
            address: formData.address,
            phone: formData.phoneNumber || undefined,
            guardianName: formData.parentName,
            guardianPhone: formData.parentPhone,
            guardianEmail: formData.parentEmail || undefined,
            emergencyContact: formData.emergencyContact,
            emergencyPhone: formData.emergencyPhone,
            gradeLevelId: selectedGradeLevel?.id,
            courseId: formData.courseId,
            medicalInfo: formData.medicalInfo || undefined,
            notes: formData.notes || undefined,
            enrollmentDate: formData.enrollmentDate,
            registrationStatus: 'REGISTERED', // ✅ REGISTERED = complete information, account activated
            status: 'PRE_REGISTERED', // ✅ PRE_REGISTERED = not yet enrolled (enrollment is separate step)
            password: formData.password || 'TempPass123!' // Pass the actual password to backend for email
          };
          
          // Send directly to API instead of through Redux for now
          const response = await fetch(`${API_BASE_URL}/students`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(createData)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create student');
          }
          
          _result = await response.json();
          
          // Dweezil's Code - Upload pending documents for new full registration student
          const pendingDocs = documentsRequired.filter(doc => doc.pendingFile);
          if (pendingDocs.length > 0 && _result.data?.id) {
            console.log(`📤 Uploading ${pendingDocs.length} pending documents for new student ${_result.data.id}`);
            
            const uploadPromises = pendingDocs.map(async (doc) => {
              if (!doc.pendingFile || !doc.id) return;
              
              try {
                const formData = new FormData();
                formData.append('document', doc.pendingFile); // Dweezil's Code - Changed from 'file' to 'document'
                formData.append('studentId', _result.data.id); // Dweezil's Code - Add studentId to body
                formData.append('requirementId', doc.id);
                // Dweezil's Code - Preserve the isInitial flag from the document object
                // Documents from Initial Requirements section should keep isInitial: true
                formData.append('isInitial', doc.isInitial ? 'true' : 'false');
                
                const uploadResponse = await fetch(`${API_BASE_URL}/student-documents/upload`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: formData
                });
                
                if (!uploadResponse.ok) {
                  const errorData = await uploadResponse.json();
                  console.error(`❌ Failed to upload ${doc.name}:`, errorData);
                } else {
                  console.log(`✅ Successfully uploaded ${doc.name}`);
                }
              } catch (error) {
                console.error(`❌ Error uploading ${doc.name}:`, error);
              }
            });
            
            await Promise.all(uploadPromises);
            console.log('✅ All pending documents uploaded');
          }
          
          // Dweezil's Code - Enrollment is now a separate step, not automatic
          // Admins should manually enroll students after creating them
          // This gives more control over the enrollment workflow
          console.log('✅ Student created successfully. Enrollment should be done separately.');
        }
      }
      
      navigate('/students');
    } catch (_error: unknown) {
      console.error('❌ Failed to save student:', _error);
      console.error('❌ Error type:', typeof _error);
      console.error('❌ Error details:', _error);
      
      // Dweezil's Code - Enhanced error handling for payment validation
      let errorMessage = 'An unexpected error occurred while saving the student';
      
      // Check if error is from Redux thunk rejection
      const error = _error as { message?: string };
      
      if (error?.message) {
        // Check if the message contains payment validation error keywords
        if (error.message.includes('payment') || 
            error.message.includes('Payment') ||
            error.message.toLowerCase().includes('no payment record')) {
          // This is a payment validation error - show clear message to user
          errorMessage = error.message;
          toast.error(errorMessage, {
            description: 'Please record the required payment before confirming the student enrollment.',
            duration: 6000
          });
        } else if (error.message.includes('document')) {
          // This is a document validation error
          errorMessage = error.message;
          toast.error(errorMessage, { duration: 5000 });
        } else {
          errorMessage = error.message;
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
      
      console.error('❌ Error message to display:', errorMessage);
      
      // Also set validation error for form display
      setValidationErrors({ submit: errorMessage });
      
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dweezil's Code - Generate student ID (used by auto-generation logic)
  const generateStudentId = async () => {
    if (!formData.courseId) {
      setValidationErrors(prev => ({
        ...prev,
        studentId: 'Please select a Program first'
      }));
      return;
    }

    setIsGeneratingStudentId(true);
    try {
      const API_BASE_URL = resolveApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/students/generate-id`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ courseId: formData.courseId })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to generate student ID');
      }

      setFormData(prev => ({ ...prev, studentId: data.data.studentId }));
      setValidationErrors(prev => {
        if (!prev.studentId) return prev;
        const next = { ...prev };
        delete next.studentId;
        return next;
      });
    } catch (_error: unknown) {
      const error = _error as Error;
      setValidationErrors(prev => ({
        ...prev,
        studentId: error?.message || 'Failed to generate student ID'
      }));
    } finally {
      setIsGeneratingStudentId(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header Area */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-20 shadow-sm`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/students')}
                className={`p-2 rounded-full transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2.5 rounded-xl shadow-blue-500/20 shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    {isEditing ? 'Edit Student Profile' : 'Student Registration'}
                  </h1>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isEditing 
                      ? `Updating records for ${formData.firstName} ${formData.lastName}`
                      : registrationMode === 'pre-registration' ? 
                      'Basic pre-registration for new applicants' : 
                      'Complete academic and personal registration'
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/students')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="student-form"
                disabled={isSubmitting}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditing ? 'Save Changes' : 
                     registrationMode === 'pre-registration' ? 'Pre-Register' : 'Create Student'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-800 dark:text-red-400">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {isLoading && isEditing ? (
          <div className="flex flex-col justify-center items-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading student profile...</span>
          </div>
        ) : (
          <form id="student-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Main Content Area (2/3) */}
            <div className="lg:col-span-2 space-y-8">
          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold">Personal Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!isEditing && registrationMode === 'pre-registration' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Existing User (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      disabled={Boolean(selectedUser)}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        selectedUser ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-75' : ''
                      }`}
                      placeholder="Search by name, email, or username"
                    />
                    {selectedUser && (
                      <button
                        type="button"
                        onClick={clearSelectedUser}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {selectedUser && (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      Selected: {selectedUser.lastName}, {selectedUser.firstName}
                      {selectedUser.middleInitial ? ` ${selectedUser.middleInitial}` : ''} ({selectedUser.email})
                    </p>
                  )}

                  {!selectedUser && (isUserSearchLoading || userSearchResults.length > 0) && (
                    <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                      {isUserSearchLoading ? (
                        <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">Searching...</div>
                      ) : (
                        userSearchResults.slice(0, 10).map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => selectExistingUser(u)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                          >
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {u.lastName}, {u.firstName}
                              {u.middleInitial ? ` ${u.middleInitial}` : ''}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {u.email} · {u.username}
                              {u.student?.id ? ' · has student record' : ''}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={isEditing || Boolean(selectedUser)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    isEditing || selectedUser ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-75' : ''
                  } ${
                    validationErrors.firstName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter first name"
                />
                {validationErrors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={isEditing || Boolean(selectedUser)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    isEditing || selectedUser ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-75' : ''
                  } ${
                    validationErrors.lastName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter last name"
                />
                {validationErrors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Middle Initial
                </label>
                <input
                  type="text"
                  name="middleInitial"
                  value={formData.middleInitial}
                  onChange={handleInputChange}
                  disabled={isEditing || Boolean(selectedUser)}
                  maxLength={5}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    isEditing || selectedUser ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-75' : ''
                  }`}
                  placeholder="M.I."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isEditing || Boolean(selectedUser)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    isEditing || selectedUser ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-75' : ''
                  } ${
                    validationErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                )}
              </div>

              {!isEditing && registrationMode === 'pre-registration' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      disabled={Boolean(selectedUser)}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        selectedUser ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-75' : ''
                      }`}
                      placeholder="Enter username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        disabled={Boolean(selectedUser)}
                        className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          selectedUser ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-75' : ''
                        }`}
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter phone number"
                />
                {validationErrors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.dateOfBirth ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {validationErrors.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.dateOfBirth}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.gender ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                {validationErrors.gender && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.gender}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.address ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter full address"
                />
                {validationErrors.address && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.address}</p>
                )}
              </div>

              {registrationMode === 'pre-registration' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Remarks (Optional)
                  </label>
                  {/* Dweezil's Code - Fix Issue #4: Use registrationNotes instead of notes */}
                  <textarea
                    name="registrationNotes"
                    value={formData.registrationNotes}
                    onChange={handleInputChange}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional information..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

            {/* Pre-Registration Requirements Section - Accordion Style */}
            {registrationMode === 'pre-registration' && (
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Initial Requirements
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Select your category to view requirements. Documents can be managed after registration.
                </p>
                
                <div className="space-y-4">
                  {PRE_REGISTRATION_GROUPS
                    .filter(group => !isEditing || !selectedCategory || selectedCategory === group.id)
                    .map(group => (
                    <div 
                      key={group.id} 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedCategory === group.id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`} 
                      onClick={() => setSelectedCategory(group.id)}
                    >
                      <div className="flex items-center mb-2">
                        <input 
                          type="radio" 
                          name="categoryGroup" 
                          checked={selectedCategory === group.id} 
                          onChange={() => setSelectedCategory(group.id)}
                          className="mr-3 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{group.label}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{group.description}</div>
                        </div>
                      </div>

                      {/* Expandable Document List */}
                      {selectedCategory === group.id && (documentsRequired.length === 0 || documentsRequired[0]?.categoryId === group.id) && (
                        <div className="mt-3 pl-7 space-y-3" onClick={e => e.stopPropagation()}>
                          {documentsRequired.map((doc) => (
                            <div key={doc.type} className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                              <div className="font-medium text-sm mb-1 text-gray-900 dark:text-white">
                                {doc.name}
                                {doc.required && <span className="text-red-500 ml-1">*</span>}
                              </div>
                              {doc.notes && <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{doc.notes}</div>}
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                                {isEditing && !doc.submitted && (
                                  <div>
                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleDocumentUpload(doc.id || doc.type, file);
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                                {!isEditing && !doc.submitted && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Upload available after saving this student.
                                  </div>
                                )}

                                {doc.submitted && (
                                  <div className="border border-gray-200 dark:border-gray-700 rounded p-2 bg-gray-50 dark:bg-gray-700">
                                    <div className="flex items-center justify-between">
                                       <span className="text-xs text-green-600 font-medium flex items-center">
                                         <CheckCircle className="h-3 w-3 mr-1" />
                                         {doc.fileName || 'File uploaded'}
                                       </span>
                                       <div className="flex space-x-2">
                                         {doc.fileUrl && (
                                            <button
                                              type="button"
                                              onClick={() => openStudentDocument(doc, 'download')}
                                              className="text-blue-600 hover:text-blue-800 text-xs"
                                            >
                                              View
                                            </button>
                                         )}
                                       </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Dweezil's Code - Issues #5 & #6: Account Information sections moved after Academic Information */}

          {/* Account Information (only for new students and full registration) */}
          {!isEditing && registrationMode === 'full-registration' && (
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold">Account Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username || ''}
                    onChange={handleInputChange}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.username ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter username"
                  />
                  {validationErrors.username && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.username}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Username will be used for login
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Confirm password"
                  />
                  {validationErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Parent/Guardian Information (only for full registration) */}
          {registrationMode === 'full-registration' && (
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold">Parent/Guardian Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Parent/Guardian Name
                  </label>
                  <input
                    type="text"
                    name="parentName"
                    value={formData.parentName}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter parent/guardian name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Parent/Guardian Phone
                  </label>
                  <input
                    type="tel"
                    name="parentPhone"
                    value={formData.parentPhone}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter parent/guardian phone"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Parent/Guardian Email
                  </label>
                  <input
                    type="email"
                    name="parentEmail"
                    value={formData.parentEmail}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter parent/guardian email"
                  />
                </div>
              </div>
            </div>
            </div>
          )}

          {/* Emergency Contact Information (only for full registration) */}
          {registrationMode === 'full-registration' && (
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
                <Phone className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold">Emergency Contact Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter emergency contact name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter emergency contact phone"
                  />
                </div>
              </div>
            </div>
            </div>
          )}

          {/* Additional Information (only for full registration) */}
          {registrationMode === 'full-registration' && (
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
                <Heart className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold">Additional Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Medical Information
                  </label>
                  <textarea
                    name="medicalInfo"
                    value={formData.medicalInfo}
                    onChange={handleInputChange}
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter any medical conditions, allergies, or special health considerations..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter any additional notes or special considerations..."
                  />
                </div>
              </div>
            </div>
            </div>
          )}

          {/* Dweezil's Code - Submitted Enrollment Subjects Section (Read-only display) */}
          {/* Only show when student has actual enrollments */}
          {isEditing && registrationMode === 'full-registration' && studentEnrollments.length > 0 && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Submitted Enrollment
              </h2>
              
              {studentEnrollments.map((enrollment) => (
                <div key={enrollment.id} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {enrollment.course?.name || 'Course'}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Status: <span className={`font-medium ${
                          enrollment.status === 'ENROLLED' ? 'text-green-600' : 
                          enrollment.status === 'PENDING' ? 'text-yellow-600' : 
                          'text-gray-600'
                        }`}>
                          {enrollment.status}
                        </span>
                        {' • '}
                        Enrolled: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      to={`/enrollments/${enrollment.id}`}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      View Details
                    </Link>
                  </div>
                  
                  {enrollment.selectedSubjects && enrollment.selectedSubjects.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Selected Subjects ({enrollment.selectedSubjects.length})
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {enrollment.selectedSubjects.map((subjectId: string, index: number) => {
                          const subject = allSubjects.find(s => s.id === subjectId);
                          return (
                            <div
                              key={subjectId || index}
                              className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                  {subject ? subject.name : `Subject ID: ${subjectId.slice(0, 8)}...`}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                  {subject ? subject.code : 'Unknown Code'}
                                </p>
                              </div>
                              {subject && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                                  {subject.units} UNITS
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          <strong>Note:</strong> This student has submitted their subject selections. 
                          Click "View Details" to see the full enrollment information and manage the enrollment status.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No subjects selected yet
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {registrationMode === 'full-registration' && (
            <>
              {/* Initial Requirements Section - Show when there are documents marked as initial AND have been uploaded */}
              {documentsRequired.some(doc => doc.isInitial && (doc.submitted || doc.fileUrl || doc.pendingFile)) && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Initial Requirements <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">(Optional)</span>
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {/* Dweezil's Code - Only show initial requirements that have been uploaded */}
                    {documentsRequired.filter(doc => doc.isInitial && (doc.submitted || doc.fileUrl || doc.pendingFile)).map((doc) => {
                      const fullFileUrl = getFullFileUrl(doc.fileUrl);

                      return (
                      <div key={doc.type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors">
                        <div className="flex items-start space-x-3">
                          <div className="flex-1 min-w-0">
                            <label htmlFor={`doc-${doc.type}`} className="text-sm font-medium text-gray-900 dark:text-white">
                              {doc.name}
                              {doc.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            
                            {/* Document status and file info */}
                            <div className="mt-2 space-y-2">
                              {doc.submitted && doc.submittedDate && (
                                <p className="text-xs text-green-600 flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Submitted on {new Date(doc.submittedDate).toLocaleDateString()}
                                </p>
                              )}
                              
                              {doc.fileUrl && doc.notes && (
                                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2">
                                  <div className="flex items-center text-sm text-green-800">
                                    <File className="h-4 w-4 mr-2" />
                                    <div className="flex flex-col">
                                      <span>{doc.notes.replace('File: ', '')}</span>
                                      {doc.fileSize && (
                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                          {formatFileSize(doc.fileSize)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => openStudentDocument(doc, 'preview')}
                                      className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:text-gray-200 p-1"
                                      title="Preview file"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openStudentDocument(doc, 'download')}
                                      className="text-blue-600 hover:text-blue-800 p-1"
                                      title="Download file"
                                    >
                                      <Download className="h-4 w-4" />
                                    </button>
                                    {registrationMode === 'full-registration' && doc.studentDocumentId && (
                                      <button
                                        type="button"
                                        onClick={() => handleDocumentDelete(documentsRequired.indexOf(doc))}
                                        className="text-red-600 hover:text-red-800 p-1"
                                        title="Delete file"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0 flex items-center space-x-3">
                            {/* Upload Progress Avatar or Upload Button */}
                            {registrationMode === 'full-registration' && isValidRequirementId(doc.id) && ( 
                              <div className="relative">
                                {uploadProgress[doc.id || doc.type]?.isUploading ? (
                                  // Show progress avatar during upload
                                  <CircularProgressAvatar
                                    progress={uploadProgress[doc.id || doc.type].progress}
                                    status={uploadProgress[doc.id || doc.type].status}
                                    fileName={uploadProgress[doc.id || doc.type].fileName}
                                    size={48}
                                  />
                                ) : uploadProgress[doc.id || doc.type]?.status === 'success' ? (
                                  // Show success avatar briefly
                                  <CircularProgressAvatar
                                    progress={100}
                                    status="success"
                                    size={48}
                                  />
                                ) : uploadProgress[doc.id || doc.type]?.status === 'error' ? (
                                  // Show error avatar briefly
                                  <CircularProgressAvatar
                                    progress={0}
                                    status="error"
                                    size={48}
                                  />
                                ) : (
                                  // Show upload button when not uploading
                                  <>
                                    <input
                                      type="file"
                                      id={`file-${doc.type}`}
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleDocumentUpload(doc.id || doc.type, file);
                                        }
                                      }}
                                      className="hidden"
                                    />
                                    <label
                                      htmlFor={`file-${doc.type}`}
                                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 cursor-pointer transition-colors"
                                      title="Upload document"
                                    >
                                      <Upload className="h-4 w-4 mr-1" />
                                      Upload
                                    </label>
                                  </>
                                )}
                              </div>
                            )}
                            
                            {/* Status indicator - only show when not uploading */}
                            {!uploadProgress[doc.id || doc.type]?.isUploading && (
                              doc.submitted ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <div className="h-5 w-5 border-2 border-gray-300 dark:border-gray-600 rounded-full"></div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong>{' '}
                      These are the initial documents submitted during pre-registration.
                    </p>
                  </div>
                </div>
              )}

              {/* Required Documents Section */}
              {/* Dweezil's Code - Always show Required Documents section when editing */}
              {/* Show all 5 required documents regardless of student status */}
              {isEditing && documentsRequired.filter(doc => !doc.isInitial).length > 0 && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Required Documents
                    </h2>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <span className="mr-2">Progress:</span>
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.round((documentsRequired.filter(d => !d.isInitial && d.submitted).length / documentsRequired.filter(d => !d.isInitial).length) * 100) || 0}%` 
                          }}
                        ></div>
                      </div>
                      <span className="font-medium">
                        {Math.round((documentsRequired.filter(d => !d.isInitial && d.submitted).length / documentsRequired.filter(d => !d.isInitial).length) * 100) || 0}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Dweezil's Code - Always show all Required Documents (isInitial: false) */}
                    {documentsRequired.filter(doc => !doc.isInitial).map((doc) => {
                    const fullFileUrl = getFullFileUrl(doc.fileUrl);
                    // Dweezil's Code - Find the correct index in the full documentsRequired array
                    const docIndex = documentsRequired.findIndex(d => d.type === doc.type && d.id === doc.id);

                    return (
                    <div key={doc.type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 min-w-0">
                          <label htmlFor={`doc-${doc.type}`} className="text-sm font-medium text-gray-900 dark:text-white">
                            {doc.name}
                            {doc.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          
                          {/* Document status and file info */}
                          <div className="mt-2 space-y-2">
                            {doc.submitted && doc.submittedDate && (
                              <p className="text-xs text-green-600 flex items-center">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Submitted on {new Date(doc.submittedDate).toLocaleDateString()}
                              </p>
                            )}
                            
                            {doc.fileUrl && doc.notes && (
                              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2">
                                <div className="flex items-center text-sm text-green-800">
                                  <File className="h-4 w-4 mr-2" />
                                  <div className="flex flex-col">
                                    <span>{doc.notes.replace('File: ', '')}</span>
                                    {doc.fileSize && (
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {formatFileSize(doc.fileSize)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => openStudentDocument(doc, 'preview')}
                                    className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:text-gray-200 p-1"
                                    title="Preview file"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openStudentDocument(doc, 'download')}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                    title="Download file"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                  {registrationMode === 'full-registration' && doc.studentDocumentId && (
                                    <button
                                      type="button"
                                      onClick={() => handleDocumentDelete(docIndex)}
                                      className="text-red-600 hover:text-red-800 p-1"
                                      title="Delete file"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0 flex items-center space-x-3">
                          {/* Upload Progress Avatar or Upload Button */}
                          {/* Dweezil's Code - Enable file upload for both new and existing students in Full Registration */}
                          {registrationMode === 'full-registration' && isValidRequirementId(doc.id) && ( 
                            <div className="relative">
                              {uploadProgress[doc.id || doc.type]?.isUploading ? (
                                // Show progress avatar during upload
                                <CircularProgressAvatar
                                  progress={uploadProgress[doc.id || doc.type].progress}
                                  status={uploadProgress[doc.id || doc.type].status}
                                  fileName={uploadProgress[doc.id || doc.type].fileName}
                                  size={48}
                                />
                              ) : uploadProgress[doc.id || doc.type]?.status === 'success' ? (
                                // Show success avatar briefly
                                <CircularProgressAvatar
                                  progress={100}
                                  status="success"
                                  size={48}
                                />
                              ) : uploadProgress[doc.id || doc.type]?.status === 'error' ? (
                                // Show error avatar briefly
                                <CircularProgressAvatar
                                  progress={0}
                                  status="error"
                                  size={48}
                                />
                              ) : (
                                // Show upload button when not uploading
                                <>
                                  <input
                                    type="file"
                                    id={`file-${doc.type}`}
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleDocumentUpload(doc.id || doc.type, file);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`file-${doc.type}`}
                                    className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 cursor-pointer transition-colors"
                                    title="Upload document"
                                  >
                                    <Upload className="h-4 w-4 mr-1" />
                                    Upload
                                  </label>
                                </>
                              )}
                            </div>
                          )}
                          
                          {/* Status indicator - only show when not uploading */}
                          {!uploadProgress[doc.id || doc.type]?.isUploading && (
                            doc.submitted ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <div className="h-5 w-5 border-2 border-gray-300 dark:border-gray-600 rounded-full"></div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong>{' '}
                    All required documents must be submitted for complete student registration.
                  </p>
                </div>
              </div>
              )}
            </>
          )}
          </div>

          {/* Sidebar Column (1/3) */}
          <div className="lg:col-span-1 space-y-8">
            {/* Registration Status & Mode */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
                <Settings className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold">Registration Status</h2>
              </div>
              <div className="p-6 space-y-6">
                {isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      name="registrationStatus"
                      value={formData.registrationStatus}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {getRegistrationStatusOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {validationErrors.registrationStatus && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.registrationStatus}</p>
                    )}
                  </div>
                )}

                {!isEditing && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                      Registration Mode: {registrationMode === 'pre-registration' ? 'Pre-registration' : 'Full Registration'}
                    </p>
                  </div>
                )}

                {isEditing && currentStudent && (
                  <div className="space-y-4">
                    {formData.registrationStatus === 'REGISTERED' && formData.studentId && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                        <label className="block text-xs font-bold text-green-800 dark:text-green-400 uppercase tracking-wider mb-1">
                          Student ID
                        </label>
                        <p className="text-lg font-mono font-bold text-green-900 dark:text-green-200">
                          {formData.studentId}
                        </p>
                      </div>
                    )}

                    {(formData.registrationStatus === 'PRE_REGISTERED' || !formData.studentId) && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Temporary ID
                        </label>
                        <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                          {currentStudent.temporaryId || 'Not assigned'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Academic Information (only for full registration) */}
            {registrationMode === 'full-registration' && (
              <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold">Academic Info</h2>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Program *
                    </label>
                    <select
                      name="courseId"
                      value={formData.courseId}
                      onChange={handleInputChange}
                      disabled={formData.registrationStatus === 'PRE_REGISTERED'}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        formData.registrationStatus === 'PRE_REGISTERED' ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-75' : ''
                      } ${
                        validationErrors.courseId ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select program</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.courseCode} - {course.name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.courseId && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.courseId}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Year Level *
                    </label>
                    <select
                      name="gradeLevel"
                      value={formData.gradeLevel}
                      onChange={handleInputChange}
                      disabled={formData.registrationStatus === 'PRE_REGISTERED'}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        formData.registrationStatus === 'PRE_REGISTERED' ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-75' : ''
                      } ${
                        validationErrors.gradeLevel ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select year level</option>
                      {gradeLevels.map((gradeLevel) => (
                        <option key={gradeLevel.id} value={gradeLevel.name}>
                          {gradeLevel.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Enrollment Date *
                    </label>
                    <input
                      type="date"
                      name="enrollmentDate"
                      value={formData.enrollmentDate}
                      onChange={handleInputChange}
                      disabled={formData.registrationStatus === 'PRE_REGISTERED'}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        formData.registrationStatus === 'PRE_REGISTERED' ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-75' : ''
                      } ${
                        validationErrors.enrollmentDate ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </div>

                  </div>
                </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="lg:col-span-3 flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700 mt-8">
            {isEditing && registrationMode === 'pre-registration' && (
              <button
                type="button"
                onClick={downloadPDF}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
              >
                <Download className="w-4 h-4 mr-2 inline" />
                Download PDF
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/students')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Update Student' : 
                   registrationMode === 'pre-registration' ? 'Pre-Register Student' : 'Create Student'}
                </>
              )}
            </button>
          </div>
        </form>
      )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
              onClick={() => {
                if (previewImage.isObjectUrl) {
                  URL.revokeObjectURL(previewImage.url);
                }
                setPreviewImage(null);
              }}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                    {previewImage.name}
                  </h3>
                  <button
                    type="button"
                    className="bg-white dark:bg-gray-800 rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-400 focus:outline-none"
                    onClick={() => {
                      if (previewImage.isObjectUrl) {
                        URL.revokeObjectURL(previewImage.url);
                      }
                      setPreviewImage(null);
                    }}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="mt-4 flex justify-center bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  {previewImage.fileType === 'application/pdf' || (previewImage.fileName || '').toLowerCase().endsWith('.pdf') ? (
                    <iframe src={previewImage.url} title={previewImage.name} className="w-full h-[70vh]" />
                  ) : previewImage.fileType?.startsWith('image/') || /\.(jpeg|jpg|gif|png|webp)$/i.test(previewImage.fileName || '') || previewImage.url.startsWith('data:image') ? (
                    <img 
                      src={previewImage.url} 
                      alt={previewImage.name} 
                      className="max-h-[70vh] object-contain" 
                    />
                  ) : (
                    <div className="text-center py-10">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Preview not available for this file type.</p>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = previewImage.url;
                          link.download = previewImage.fileName || previewImage.name;
                          link.target = '_blank';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download to View
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    if (previewImage.isObjectUrl) {
                      URL.revokeObjectURL(previewImage.url);
                    }
                    setPreviewImage(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentForm;
