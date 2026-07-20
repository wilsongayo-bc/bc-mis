import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Edit,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  BookOpen,
  CreditCard,
  FileText,
  Download,
  Eye,
  X
} from 'lucide-react';
import Avatar from '../components/Avatar';
import {
  fetchStudentById,
  selectCurrentStudent,
  selectStudentLoading,
  selectStudentError,
  clearError,
  clearCurrentStudent
} from '../store/slices/studentSlice';
import { selectUser as selectAuthUser } from '../store/slices/authSlice';
import type { AppDispatch } from '../store';
import { getStudentStatusBadge, getRegistrationStatusBadge, getEnrollmentStatusBadge } from '../utils/statusBadges';

// Document requirement interface - matches StudentForm.tsx
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
  categoryId?: string;
  isInitial?: boolean;
  validationRules?: {
    maxFileSize?: number;
    allowedFileTypes?: string[];
    requiresVerification?: boolean;
  };
  applicableGradeLevels?: string[];
  expirationDays?: number;
  studentDocumentId?: string;
}

/**
 * StudentDetails component for viewing individual student information
 * Features: student overview, academic details, contact information, actions
 */
const StudentDetails: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const student = useSelector(selectCurrentStudent);
  const isLoading = useSelector(selectStudentLoading);
  const error = useSelector(selectStudentError);
  const authUser = useSelector(selectAuthUser);

  const [_isProcessing, _setIsProcessing] = useState(false);
  const [documentsRequired, setDocumentsRequired] = useState<DocumentRequirement[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string; fileName?: string; fileType?: string; isObjectUrl?: boolean } | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);
  // Dweezil's Code - Add state for recent activity
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    action: string;
    method: string;
    endpoint: string;
    statusCode: number;
    params?: unknown;
    createdAt: string;
  }>>([]);
  // Dweezil's Code - Add state for enrollments/course
  const [enrollments, setEnrollments] = useState<Array<{
    id: string;
    courseId: string;
    status: string;
    enrollmentDate: string;
    course: {
      id: string;
      name: string;
      courseCode: string;
    };
  }>>([]);

  // Merge two requirement lists, preserving submission/file info
  const mergeRequirements = useCallback((base: DocumentRequirement[], extras: DocumentRequirement[]): DocumentRequirement[] => {
    const byKey = new Map<string, DocumentRequirement>();

    const keyOf = (doc: DocumentRequirement) => doc.id || doc.type;

    const put = (doc: DocumentRequirement) => {
      const key = keyOf(doc);
      if (!key) return;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, doc);
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
      byKey.set(key, merged);
    };

    base.forEach(put);
    extras.forEach(put);
    return Array.from(byKey.values());
  }, []);

  // Function to fetch document requirements from API (same as StudentForm.tsx)
  const fetchDocumentRequirements = useCallback(async (_gradeLevel?: string) => {
    try {
      console.log('🔍 [DEBUG] fetchDocumentRequirements called - fetching ALL requirements');
      const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://api.benedictcollege.com/api' : '/api');
      const params = new URLSearchParams();
      
      // Dweezil's Code - Don't filter by grade level in StudentDetails, show ALL documents
      // This ensures Initial Requirements are always visible regardless of grade level selection
      
      const url = `${API_BASE_URL}/document-requirements/for-registration?${params}`;
      console.log('🔍 [DEBUG] Fetching from URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 [DEBUG] API response status:', response.status);
      console.log('🔍 [DEBUG] API response ok:', response.ok);

      if (response.ok) {
        const requirementsData = await response.json();
        console.log('🔍 [DEBUG] Raw API response data:', requirementsData);
        const requirements = requirementsData.data?.flat || [];
        console.log('🔍 [DEBUG] Extracted requirements array:', requirements);
        console.log('🔍 [DEBUG] Requirements array length:', requirements.length);
        
        // Ensure requirements is an array before mapping
        if (!Array.isArray(requirements)) {
          console.warn('🔍 [DEBUG] Document requirements data is not an array');
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
          categoryId: req.categoryId,
          isInitial: req.isInitial || false,
          validationRules: req.validationRules,
          applicableGradeLevels: req.applicableGradeLevels,
          expirationDays: req.expirationDays
        }));
        
        console.log('🔍 [DEBUG] Formatted requirements:', formattedRequirements);
        console.log('🔍 [DEBUG] Setting documentsRequired state with length:', formattedRequirements.length);
        setDocumentsRequired(formattedRequirements);
        return formattedRequirements;
      } else {
        console.warn('🔍 [DEBUG] Failed to fetch document requirements - response not ok');
        setDocumentsRequired([]);
        return [];
      }
    } catch (error) {
      console.error('🔍 [DEBUG] Error fetching document requirements:', error);
      setDocumentsRequired([]);
      return [];
    }
  }, []);

  // Dweezil's Code - Function to fetch existing student documents and merge with requirements
  const fetchStudentDocuments = useCallback(async (studentId: string) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://api.benedictcollege.com/api' : '/api');
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
        // Dweezil's Code - Debug: Log first document to see what fields are present
        if (documents.length > 0) {
          console.log('🔍 Sample document from API:', {
            id: documents[0].id,
            requirementId: documents[0].requirementId,
            isInitial: documents[0].isInitial,
            status: documents[0].status,
            fileName: documents[0].fileName,
            requirement: documents[0].requirement
          });
        }
        
        // Dweezil's Code - Track which documents have been matched to prevent duplicates
        const matchedDocumentIds = new Set<string>();
        
        // Update document requirements with submitted status
        setDocumentsRequired(prev => {
          console.log('🔄 Updating requirements, prev count:', prev.length);
          
          return prev.map(req => {
            // Dweezil's Code - Enhanced matching with detailed logging
            // CRITICAL FIX: Only match each document to ONE requirement to prevent duplicates
            const submittedDoc = documents.find((doc: {
              id: string;
              requirementId?: string;
              requirement?: {
                id: string;
                name: string;
                isInitial?: boolean;
              };
              fileUrl?: string;
              fileName?: string;
              fileSize?: number;
              submittedDate?: string;
              notes?: string;
              status?: string;
              filePath?: string;
              submittedAt?: string;
              isInitial?: boolean;
            }) => {
              // Skip if this document has already been matched to another requirement
              if (matchedDocumentIds.has(doc.id)) {
                return false;
              }
              
              // Strategy 1: Match by requirement ID directly (MOST RELIABLE - use this first!)
              if (doc.requirementId && doc.requirementId === req.id) {
                console.log('✅ Match found (requirementId):', req.name, 'Doc ID:', doc.id, 'Req ID:', req.id);
                matchedDocumentIds.add(doc.id);
                return true;
              }
              
              // Strategy 2: Match by requirement.id (fallback if requirementId is not set)
              if (doc.requirement?.id === req.id) {
                console.log('✅ Match found (requirement.id):', req.name, 'Doc ID:', doc.id, 'Req ID:', req.id);
                matchedDocumentIds.add(doc.id);
                return true;
              }
              
              // IMPORTANT: Do NOT use name-based matching if the document has a requirementId
              // This prevents documents from matching multiple requirements with the same name
              if (doc.requirementId || doc.requirement?.id) {
                return false;
              }
              
              // Strategy 3: Match by requirement name (ONLY as last resort for legacy data)
              // This should only match if the document doesn't have a requirementId
              if (doc.requirement?.name && req.name && 
                  doc.requirement.name.toLowerCase() === req.name.toLowerCase()) {
                console.log('⚠️ Match found (exact name - legacy):', req.name, 'Doc ID:', doc.id);
                matchedDocumentIds.add(doc.id);
                return true;
              }
              
              // Strategy 4: Match by normalized type (LAST RESORT for very old data)
              const docType = doc.requirement?.name?.toLowerCase().replace(/[^a-z0-9]/g, '_');
              if (docType === req.type) {
                console.log('⚠️ Match found (normalized type - legacy):', req.name, 'Doc ID:', doc.id);
                matchedDocumentIds.add(doc.id);
                return true;
              }
              
              return false;
            });
            
            if (submittedDoc) {
              // Dweezil's Code - Fix status check to handle both uppercase and lowercase
              const docStatus = (submittedDoc.status || '').toUpperCase();
              console.log('📝 Marking as submitted:', req.name, 'Status:', docStatus, 'isInitial:', submittedDoc.isInitial);
              return {
                ...req,
                // CRITICAL: Use the isInitial flag from the SUBMITTED DOCUMENT, not from the requirement
                // This ensures documents appear in the section where they were actually uploaded
                isInitial: submittedDoc.isInitial === true,
                submitted: docStatus === 'SUBMITTED' || docStatus === 'VERIFIED' || docStatus === 'APPROVED' || docStatus === 'PENDING',
                submittedDate: submittedDoc.submittedAt ? new Date(submittedDoc.submittedAt) : undefined,
                fileUrl: submittedDoc.fileUrl || submittedDoc.filePath,
                fileName: submittedDoc.fileName,
                fileSize: submittedDoc.fileSize,
                notes: submittedDoc.fileName ? `File: ${submittedDoc.fileName}` : `Status: ${submittedDoc.status}`,
                studentDocumentId: submittedDoc.id
              };
            }
            
            // Only log "no match" for documents that actually exist in the database
            // (i.e., documents that have a requirement object)
            const unmatchedDocs = documents.filter((doc: { requirement?: { name: string } }) => 
              doc.requirement && !documents.some((d: { requirement?: { id: string; name: string } }) => 
                d.requirement?.id === req.id || 
                d.requirement?.name?.toLowerCase() === req.name?.toLowerCase()
              )
            );
            
            if (unmatchedDocs.length > 0) {
              console.log('❌ No match found for:', req.name, 'Req ID:', req.id);
            }
            
            return req;
          });
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
  }, [documentsRequired.length]);

  // Load student data
  useEffect(() => {
    if (id) {
      dispatch(fetchStudentById(id));
    }
    
    return () => {
      dispatch(clearCurrentStudent());
      dispatch(clearError());
    };
  }, [dispatch, id]);

  // Dweezil's Code - Fetch recent activity for the student
  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!id) {
        console.log('🔍 [DEBUG] No student id found, cannot fetch activity logs');
        return;
      }
      
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://api.benedictcollege.com/api' : '/api');
        
        // Fetch all recent activities and filter by endpoint containing student ID
        // This captures admin actions on the student (create, update, document uploads, etc.)
        console.log('🔍 [DEBUG] Fetching activity logs for student:', id);
        const url = `${API_BASE_URL}/activity-logs?limit=100`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('🔍 [DEBUG] Activity logs response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 [DEBUG] Total activity logs fetched:', data.data?.length || 0);
          
          // Filter activities that mention this student's ID in the endpoint or params
          const filteredActivities = (data.data || []).filter((activity: typeof recentActivity[0]) => {
            const matchesEndpoint = activity.endpoint.includes(`/students/${id}`) || 
                                   activity.endpoint.includes(`student=${id}`) ||
                                   activity.endpoint.includes(`studentId=${id}`) ||
                                   activity.endpoint.includes(`/student-documents/student/${id}`);
            
            // Also check params JSON for student ID
            let matchesParams = false;
            if (activity.params) {
              try {
                const paramsStr = typeof activity.params === 'string' ? activity.params : JSON.stringify(activity.params);
                matchesParams = paramsStr.includes(id);
              } catch (e) {
                // Ignore parse errors
              }
            }
            
            return matchesEndpoint || matchesParams;
          }).slice(0, 5);
          
          console.log('🔍 [DEBUG] Filtered activities by endpoint/params:', filteredActivities.length);
          console.log('🔍 [DEBUG] Filtered activities:', filteredActivities);
          setRecentActivity(filteredActivities);
        } else {
          console.warn('🔍 [DEBUG] Failed to fetch activity logs, status:', response.status);
        }
      } catch (error) {
        console.error('🔍 [DEBUG] Error fetching recent activity:', error);
      }
    };

    fetchRecentActivity();
  }, [id]);

  // Dweezil's Code - Fetch enrollments for the student
  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!id) return;
      
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://api.benedictcollege.com/api' : '/api');
        const response = await fetch(`${API_BASE_URL}/enrollments/student/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📚 Fetched enrollments for student:', data.data);
          setEnrollments(data.data || []);
        } else {
          console.warn('⚠️ Failed to fetch enrollments, status:', response.status);
          setEnrollments([]);
        }
      } catch (error) {
        console.error('❌ Error fetching enrollments:', error);
        setEnrollments([]);
      }
    };

    fetchEnrollments();
  }, [id]);

  // Fetch and merge document requirements with any existing student documents
  useEffect(() => {
    if (!student) return;

    // Dweezil's Code - Don't pass grade level to fetchDocumentRequirements
    // This ensures ALL requirements (including Initial Requirements) are always fetched
    // regardless of the student's grade level
    const existingDocs: DocumentRequirement[] = (student.documentsRequired || []).map((req) => ({
      type: (req as { type?: string }).type || req.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: req.name,
      description: undefined,
      required: req.required,
      submitted: req.submitted || false,
      submittedDate: req.submittedDate ? new Date(req.submittedDate) : undefined,
      fileUrl: req.fileUrl,
      fileName: req.fileName,
      fileSize: req.fileSize,
      notes: req.notes,
      id: (req as { id?: string }).id
    }));

    const load = async () => {
      // Dweezil's Code - Fetch requirements and documents, then merge ONCE to avoid state race condition
      const baseReqs = await fetchDocumentRequirements();
      
      // Don't set state yet - wait for documents to be fetched
      const merged = mergeRequirements(Array.isArray(baseReqs) ? baseReqs : [], existingDocs);
      
      // Fetch student documents if we have an ID
      if (id) {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://api.benedictcollege.com/api' : '/api');
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
            console.log('📋 Current requirements:', merged.length);
            if (documents.length > 0) {
              console.log('🔍 Sample document from API:', {
                id: documents[0].id,
                requirementId: documents[0].requirementId,
                isInitial: documents[0].isInitial,
                status: documents[0].status,
                fileName: documents[0].fileName,
                requirement: documents[0].requirement
              });
            }
            
            // Dweezil's Code - Track which documents have been matched to prevent duplicates
            const matchedDocumentIds = new Set<string>();
            
            // Update merged requirements with submitted documents
            const finalRequirements = merged.map(req => {
              const submittedDoc = documents.find((doc: any) => {
                if (matchedDocumentIds.has(doc.id)) return false;
                
                if (doc.requirementId && doc.requirementId === req.id) {
                  console.log('✅ Match found (requirementId):', req.name, 'Doc ID:', doc.id, 'Req ID:', req.id);
                  matchedDocumentIds.add(doc.id);
                  return true;
                }
                
                if (doc.requirement?.id === req.id) {
                  console.log('✅ Match found (requirement.id):', req.name, 'Doc ID:', doc.id, 'Req ID:', req.id);
                  matchedDocumentIds.add(doc.id);
                  return true;
                }
                
                if (doc.requirementId || doc.requirement?.id) return false;
                
                if (doc.requirement?.name && req.name && 
                    doc.requirement.name.toLowerCase() === req.name.toLowerCase()) {
                  console.log('⚠️ Match found (exact name - legacy):', req.name, 'Doc ID:', doc.id);
                  matchedDocumentIds.add(doc.id);
                  return true;
                }
                
                const docType = doc.requirement?.name?.toLowerCase().replace(/[^a-z0-9]/g, '_');
                if (docType === req.type) {
                  console.log('⚠️ Match found (normalized type - legacy):', req.name, 'Doc ID:', doc.id);
                  matchedDocumentIds.add(doc.id);
                  return true;
                }
                
                return false;
              });
              
              if (submittedDoc) {
                const docStatus = (submittedDoc.status || '').toUpperCase();
                console.log('📝 Marking as submitted:', req.name, 'Status:', docStatus, 'isInitial:', submittedDoc.isInitial);
                return {
                  ...req,
                  isInitial: submittedDoc.isInitial === true,
                  submitted: docStatus === 'SUBMITTED' || docStatus === 'VERIFIED' || docStatus === 'APPROVED' || docStatus === 'PENDING',
                  submittedDate: submittedDoc.submittedAt ? new Date(submittedDoc.submittedAt) : undefined,
                  fileUrl: submittedDoc.fileUrl || submittedDoc.filePath,
                  fileName: submittedDoc.fileName,
                  fileSize: submittedDoc.fileSize,
                  notes: submittedDoc.fileName ? `File: ${submittedDoc.fileName}` : `Status: ${submittedDoc.status}`,
                  studentDocumentId: submittedDoc.id
                };
              }
              
              return req;
            });
            
            // Set state ONCE with final merged data
            setDocumentsRequired(finalRequirements);
          } else {
            // No documents found, just use merged requirements
            setDocumentsRequired(merged);
          }
        } catch (error) {
          console.error('Error fetching student documents:', error);
          // On error, just use merged requirements
          setDocumentsRequired(merged);
        }
      } else {
        // No student ID, just use merged requirements
        setDocumentsRequired(merged);
      }
    };

    load();
  }, [student, id]); // Dweezil's Code - Removed function dependencies to prevent infinite re-renders that reset state

  // Dweezil's Code - Use shared status badge utilities
  const getStatusBadge = getStudentStatusBadge;

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    // Check if date is the default "Jan 1, 1970" or similar invalid dates
    if (date.getFullYear() <= 1970) return 'Not set';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate age
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };



  // Helper to get full file URL
  const getFullFileUrl = (path: string | undefined) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    
    // Default backend URL
    let baseUrl = 'http://localhost:3001';
    
    // Try to get from env
    const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
    if (envApiUrl) {
      try {
        // If full URL provided (e.g., http://localhost:3001/api), extract origin
        if (envApiUrl.startsWith('http')) {
          const url = new URL(envApiUrl);
          baseUrl = url.origin;
        } 
        // If relative path (e.g., /api), we can't easily guess origin in browser unless we know we are in dev/prod
        // But usually in dev, we want localhost:3001
      } catch (e) {
        console.warn('Error parsing API URL:', e);
      }
    } else if (import.meta.env.PROD) {
      baseUrl = 'https://api.benedictcollege.com';
    }
    
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  };

  const resolveApiBaseUrl = () => {
    return (
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      (import.meta.env.PROD ? 'https://api.benedictcollege.com/api' : '/api')
    );
  };

  const getDocumentAccess = async (studentDocumentId: string) => {
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

  const fetchLocalDocumentBlobUrl = async (studentDocumentId: string) => {
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
      const name = doc.name;
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

      const access = await getDocumentAccess(studentDocumentId);
      if (!access?.url) return;

      let url = access.url;
      let isObjectUrl = false;

      if (access.requiresAuthDownload) {
        url = await fetchLocalDocumentBlobUrl(studentDocumentId);
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

  // Calculate document progress
  const getDocumentProgress = () => {
    if (!documentsRequired || documentsRequired.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    
    // Dweezil's Code - Only count "Required Documents" (isInitial: false), not "Initial Requirements" (isInitial: true)
    // This ensures the progress bar in the "Required Documents" section only reflects those documents
    const requiredDocs = documentsRequired.filter(doc => doc.required && doc.isInitial === false);
    const submittedRequiredDocs = requiredDocs.filter(doc => doc.submitted);
    
    return {
      completed: submittedRequiredDocs.length,
      total: requiredDocs.length,
      percentage: requiredDocs.length > 0 ? Math.round((submittedRequiredDocs.length / requiredDocs.length) * 100) : 0
    };
  };

  // Dweezil's Code
  // Get document status - prioritize submitted status over required status
  const getDocumentStatus = (doc: DocumentRequirement) => {
    // If document is submitted, always show "Submitted" regardless of required status
    if (doc.submitted) {
      return { 
        label: 'Submitted', 
        color: 'bg-green-100 text-green-800', 
        icon: CheckCircle 
      };
    }
    
    // If not submitted and not required, show "Not Required"
    if (!doc.required) {
      return { 
        label: 'Not Required', 
        color: 'bg-gray-100 dark:bg-gray-700 text-gray-800', 
        icon: FileText 
      };
    }
    
    // If not submitted but required, show "Pending"
    return { 
      label: 'Pending', 
      color: 'bg-yellow-100 text-yellow-800', 
      icon: Clock 
    };
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading student details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Student not found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">The student you're looking for doesn't exist.</p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/students')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Students
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/students')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="flex items-center space-x-4">
            {student.user && (
              <Avatar
                user={{
                  id: student.user.id,
                  firstName: student.user.firstName,
                  lastName: student.user.lastName,
                  email: student.user.email,
                  username: student.user.email, // Use email as username fallback
                  position: 'Student',
                  role: student.user.role as 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'REGISTRAR' | 'FINANCE' | 'LIBRARIAN',
                  isActive: true,
                  isEmailVerified: (student.user as any).isEmailVerified || false,
                  status: 'active' as 'active' | 'inactive',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  avatarUrl: (student.user as { avatarUrl?: string }).avatarUrl
                }}
                size="xl"
                showUpload={false}
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                {student.user?.firstName} {student.user?.lastName}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {student.registrationStatus === 'PRE_REGISTERED' 
                  ? `Temporary ID: ${student.temporaryId}` 
                  : `Student ID: ${student.studentId}`
                } • {student.registrationStatus === 'PRE_REGISTERED' 
                  ? 'Not yet enrolled' 
                  : (student.gradeLevel?.name || 'Not assigned')
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {enrollments && enrollments.length > 0
            ? getEnrollmentStatusBadge(enrollments[0].status)
            : getStatusBadge(student.status)
          }
          {(() => {
            const canEditStudent = authUser?.role === 'SUPERADMIN' || authUser?.role === 'ADMIN' || authUser?.role === 'REGISTRAR';
            const isDisabled = !canEditStudent;
            return (
          <button
            onClick={() => {
              if (!isDisabled) navigate(`/students/${id}/edit`);
            }}
            disabled={isDisabled}
            title={isDisabled ? "You don't have permission to edit students." : 'Edit student'}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </button>
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h2>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                  {student.user?.firstName} {student.user?.lastName}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                  {student.dateOfBirth ? (
                    <>
                      {formatDate(student.dateOfBirth)}
                      <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">({calculateAge(student.dateOfBirth)} years old)</span>
                    </>
                  ) : (
                    'Not provided'
                  )}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center font-medium">
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  {student.user?.email || 'Not provided'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center font-medium">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  {student.phoneNumber || 'Not provided'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Gender</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                  {student.gender || 'Not provided'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center font-medium">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  {student.address || 'Not provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Information</h2>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {student.registrationStatus === 'PRE_REGISTERED' ? 'Temporary ID' : 'Student ID'}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                  {student.registrationStatus === 'PRE_REGISTERED' 
                    ? student.temporaryId 
                    : student.studentId
                  }
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Year Level</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                  {student.registrationStatus === 'PRE_REGISTERED' 
                    ? 'Not yet enrolled' 
                    : (student.gradeLevel?.name || 'Not assigned')
                  }
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Program</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                  {(() => {
                    if (enrollments && enrollments.length > 0 && enrollments[0]?.course) {
                      return `${enrollments[0].course.courseCode} - ${enrollments[0].course.name}`;
                    } else if (student.course) {
                      return `${student.course.courseCode} - ${student.course.name}`;
                    } else if (student.registrationStatus === 'PRE_REGISTERED' || student.registrationStatus === 'WITHDRAWN') {
                      return 'Not yet enrolled';
                    } else {
                      return 'Not enrolled in any course';
                    }
                  })()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Enrollment Date</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    {student.registrationStatus === 'PRE_REGISTERED' || student.registrationStatus === 'WITHDRAWN'
                      ? 'Not yet enrolled' 
                      : new Date(student.enrollmentDate).toLocaleDateString()
                    }
                  </div>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Registration Status</dt>
                <dd className="mt-1">
                  {getRegistrationStatusBadge(student.registrationStatus || 'PRE_REGISTERED')}
                </dd>
              </div>
              
              {enrollments && enrollments.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Enrollment Status</dt>
                  <dd className="mt-1">
                    {getEnrollmentStatusBadge(enrollments[0].status)}
                  </dd>
                </div>
              )}
            </div>
          </div>

          {/* Parent/Guardian Information */}
          {(student.guardianName || student.guardianPhone || student.guardianEmail || student.emergencyContact) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Parent/Guardian Information</h2>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {student.guardianName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Parent/Guardian Name</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white font-medium">{student.guardianName}</p>
                  </div>
                )}
                
                {student.guardianPhone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Parent Phone</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center font-medium">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      {student.guardianPhone}
                    </p>
                  </div>
                )}
                
                {student.guardianEmail && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Parent Email</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center font-medium">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      {student.guardianEmail}
                    </p>
                  </div>
                )}
                
                {student.emergencyContact && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Emergency Contact</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white font-medium">{student.emergencyContact}</p>
                  </div>
                )}
                
                {student.emergencyPhone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Emergency Phone</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center font-medium">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      {student.emergencyPhone}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Information */}
          {(student.medicalInfo || student.notes) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Information</h2>
              </div>
              
              <div className="p-6 space-y-6">
                {student.medicalInfo && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Medical Information</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white font-medium whitespace-pre-wrap">{student.medicalInfo}</p>
                  </div>
                )}
                
                {student.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Notes</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white font-medium whitespace-pre-wrap">{student.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Initial Requirements */}
          {documentsRequired.some(doc => doc.isInitial === true && doc.submitted && doc.studentDocumentId) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Initial Requirements</h2>
              </div>
              
              <div className="p-6 space-y-4">
                {documentsRequired
                  .filter(doc => doc.isInitial === true && doc.submitted && doc.studentDocumentId)
                  .map((doc, index) => {
                    const status = getDocumentStatus(doc);
                    const StatusIcon = status.icon;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <StatusIcon className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</h3>
                            {doc.submitted && doc.submittedDate && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Submitted on {formatDate(doc.submittedDate.toString())}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                          
                          {doc.submitted && doc.fileUrl && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => openStudentDocument(doc, 'preview')}
                                className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                                title="Preview document"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openStudentDocument(doc, 'download')}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                                title="Download document"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Required Documents */}
          {documentsRequired.some(doc => doc.isInitial !== true && doc.submitted && doc.studentDocumentId) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Required Documents</h2>
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <span className="mr-2">Progress:</span>
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getDocumentProgress().percentage}%` }}
                    ></div>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{getDocumentProgress().percentage}%</span>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {documentsRequired
                  .filter(doc => doc.isInitial !== true && doc.submitted && doc.studentDocumentId)
                  .map((doc, index) => {
                    const status = getDocumentStatus(doc);
                    const StatusIcon = status.icon;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <StatusIcon className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</h3>
                            {doc.submitted && doc.submittedDate && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Submitted on {formatDate(doc.submittedDate.toString())}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                          
                          {doc.submitted && doc.fileUrl && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => openStudentDocument(doc, 'preview')}
                                className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                                title="Preview document"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openStudentDocument(doc, 'download')}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                                title="Download document"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => navigate(`/enrollments?student=${student.id}`)}
                className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <BookOpen className="w-4 h-4 mr-3 text-blue-600 dark:text-blue-400" />
                View Enrollments
              </button>
              
              <button
                onClick={() => navigate(`/payments?student=${student.id}`)}
                className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-3 text-green-600 dark:text-green-400" />
                View Payments
              </button>
              
              <button
                onClick={() => {
                  const canEditStudent = authUser?.role === 'SUPERADMIN' || authUser?.role === 'ADMIN' || authUser?.role === 'REGISTRAR';
                  if (canEditStudent) navigate(`/students/${id}/edit`);
                }}
                disabled={!(authUser?.role === 'SUPERADMIN' || authUser?.role === 'ADMIN' || authUser?.role === 'REGISTRAR')}
                className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit className="w-4 h-4 mr-3 text-orange-600 dark:text-orange-400" />
                Edit Student
              </button>
            </div>
          </div>

          {/* Student Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Student Overview</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Student Since</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {student.registrationStatus === 'PRE_REGISTERED' 
                    ? 'Not set' 
                    : formatDate(student.enrollmentDate)
                  }
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Current Status</span>
                <span className={`text-sm font-medium inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                  student.registrationStatus === 'REGISTERED'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                    : student.registrationStatus === 'WITHDRAWN'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : student.registrationStatus === 'PRE_REGISTERED'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {student.registrationStatus ? 
                    student.registrationStatus.split('_').map(word => 
                      word.charAt(0) + word.slice(1).toLowerCase()
                    ).join(' ') 
                    : 'Unknown'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Grade Level</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {student.registrationStatus === 'PRE_REGISTERED' 
                    ? 'Not yet enrolled' 
                    : (student.gradeLevel?.name || 'Not assigned')
                  }
                </span>
              </div>
              
              {student.dateOfBirth && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Age</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {calculateAge(student.dateOfBirth)} years
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            </div>
            <div className="p-6">
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => {
                    const getFriendlyAction = (action: string, endpoint: string) => {
                      if (endpoint.includes('/auth/login')) return 'Logged in';
                      if (endpoint.includes('/auth/logout')) return 'Logged out';
                      if (endpoint.includes('/auth/profile')) return 'Viewed profile';
                      if (endpoint.includes('/register')) return 'Account created';
                      if (endpoint.includes('/students/pre-register')) return 'Pre-registered';
                      if (endpoint.includes('/students') && action.includes('POST')) return 'Student record created';
                      if (endpoint.includes('/students') && action.includes('PUT')) return 'Student info updated';
                      if (endpoint.includes('/students') && action.includes('GET')) return 'Viewed details';
                      if (endpoint.includes('/student-documents/upload')) return 'Uploaded document';
                      if (endpoint.includes('/student-documents') && action.includes('DELETE')) return 'Deleted document';
                      if (endpoint.includes('/enrollments') && action.includes('POST')) return 'Enrolled in program';
                      if (endpoint.includes('/payments') && action.includes('POST')) return 'Made payment';
                      return action.replace('POST ', 'Created ').replace('PUT ', 'Updated ').replace('GET ', 'Viewed ').replace('DELETE ', 'Deleted ');
                    };
                    
                    const friendlyAction = getFriendlyAction(activity.action, activity.endpoint);
                    if (!friendlyAction) return null;

                    const formatActivityTimestamp = (timestamp: string) => {
                      try {
                        const date = new Date(timestamp);
                        if (isNaN(date.getTime())) return 'Invalid date';
                        return date.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        });
                      } catch (error) {
                        return 'Invalid date';
                      }
                    };

                    return (
                      <div key={activity.id} className="flex items-start space-x-3 text-sm">
                        <div className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full ${
                          activity.statusCode >= 200 && activity.statusCode < 300 
                            ? 'bg-green-500' 
                            : activity.statusCode >= 400 
                            ? 'bg-red-500' 
                            : 'bg-yellow-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-white font-medium">
                            {friendlyAction}
                          </p>
                          <p className="text-gray-400 dark:text-gray-500 text-xs">
                            {formatActivityTimestamp(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Clock className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{previewImage.name}</h3>
              <button
                onClick={() => {
                  if (previewImage.isObjectUrl) {
                    URL.revokeObjectURL(previewImage.url);
                  }
                  setPreviewImage(null);
                }}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-400 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100">
              {previewImage.fileType === 'application/pdf' || (previewImage.fileName || '').toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={previewImage.url} 
                  className="w-full h-[70vh]" 
                  title={previewImage.name}
                />
              ) : previewImage.fileType?.startsWith('image/') || /\.(jpeg|jpg|gif|png|webp)$/i.test(previewImage.fileName || '') ? (
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : (
                <div className="text-center py-10">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Preview not available for this file type.</p>
                  <button
                    onClick={() => window.open(previewImage.url, '_blank')}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download to View
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetails;
