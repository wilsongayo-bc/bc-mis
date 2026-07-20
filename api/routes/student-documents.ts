import { Router, Response, IRouter, RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppDataSource } from '../config/database';
import { StudentDocument, DocumentStatus, DocumentMetadata } from '../entities/StudentDocument';
import { DocumentRequirement } from '../entities/DocumentRequirement';
import { Student } from '../entities/Student';
import { UserRole } from '../entities/User';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router: IRouter = Router();
const studentDocumentRepository = AppDataSource.getRepository(StudentDocument);
const documentRequirementRepository = AppDataSource.getRepository(DocumentRequirement);
const studentRepository = AppDataSource.getRepository(Student);

/**
 * Utility function to convert file extensions to MIME types
 */
function extensionToMimeType(extension: string): string {
  const mimeTypeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'rtf': 'application/rtf'
  };
  
  // Remove leading dot if present and convert to lowercase
  const cleanExtension = extension.replace(/^\./, '').toLowerCase();
  return mimeTypeMap[cleanExtension] || '';
}

/**
 * Utility function to normalize allowed file types to MIME types
 */
function normalizeAllowedFileTypes(allowedTypes: string[]): string[] {
  return allowedTypes.map(type => {
    // If it's already a MIME type (contains '/'), return as is
    if (type.includes('/')) {
      return type;
    }
    // Otherwise, treat as extension and convert to MIME type
    return extensionToMimeType(type);
  }).filter(type => type !== ''); // Remove empty strings (unsupported extensions)
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB default limit
  },
  fileFilter: (req, file, cb) => {
    // Default allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDF, and Word documents are allowed.'));
    }
  }
});

// Helper to convert an internal file system path into a web-accessible URL
// Assumes files are stored somewhere under a directory named "uploads"
const mapFilePathToUrl = (filePath?: string | null): string | undefined => {
  if (!filePath) return undefined;

  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  if (normalized.startsWith('/uploads/')) return normalized;

  const uploadsIndex = normalized.indexOf('/uploads/');
  if (uploadsIndex !== -1) {
    const urlPath = normalized.substring(uploadsIndex);
    return urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  }

  const hostedRoots = ['/app/uploads-prod/', '/app/uploads-uat/', '/app/uploads/'];
  for (const root of hostedRoots) {
    const idx = normalized.indexOf(root);
    if (idx !== -1) {
      const rel = normalized.substring(idx + root.length);
      return `/uploads/${rel}`;
    }
  }
  return undefined;
};

const buildDocumentFileUrl = (doc: Pick<StudentDocument, 'id' | 'filePath'>): string | undefined => {
  if (doc.filePath && (doc.filePath.startsWith('http://') || doc.filePath.startsWith('https://'))) {
    return doc.filePath;
  }
  if (!doc.id) return undefined;
  return `/api/student-documents/${doc.id}/download`;
};

const parseR2Uri = (value: string): { bucket: string; key: string } | null => {
  if (!value.startsWith('r2://')) return null;
  const rest = value.slice('r2://'.length);
  const firstSlash = rest.indexOf('/');
  if (firstSlash === -1) return null;
  const bucket = rest.slice(0, firstSlash);
  const key = rest.slice(firstSlash + 1);
  if (!bucket || !key) return null;
  return { bucket, key };
};

const shouldUseR2 = (): boolean => {
  const provider = String(process.env.UPLOAD_PROVIDER || '').trim().toLowerCase();
  if (provider === 'r2') return true;
  return Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
};

const getR2Client = (): S3Client => {
  const accountId = String(process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || '').trim();
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 configuration missing');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true
  });
};

const toSafeExtension = (fileName: string): string => {
  const ext = path.extname(fileName || '').toLowerCase();
  if (!ext) return '';
  if (!/^\.[a-z0-9]{1,8}$/.test(ext)) return '';
  return ext;
};

const buildR2ObjectKey = (params: { studentId: string; requirementId: string; originalName: string }): string => {
  const ext = toSafeExtension(params.originalName);
  return `student-documents/${params.studentId}/${params.requirementId}/${Date.now()}${ext}`;
};

const resolveWritableUploadsDir = async (): Promise<string> => {
  const candidates = [
    process.env.UPLOADS_DIR,
    process.env.NODE_ENV === 'production' ? '/app/uploads' : undefined,
    path.resolve(process.cwd(), 'public', 'uploads'),
    '/tmp/uploads'
  ].filter(Boolean) as string[];

  for (const root of candidates) {
    const dir = path.join(root, 'documents');
    try {
      await fs.mkdir(dir, { recursive: true });
      return dir;
    } catch (_error) {
      const err = _error as { code?: string };
      if (err?.code === 'EACCES' || err?.code === 'EPERM' || err?.code === 'EROFS') {
        continue;
      }
      continue;
    }
  }

  const fallback = path.join('/tmp/uploads', 'documents');
  await fs.mkdir(fallback, { recursive: true });
  return fallback;
};

/**
 * GET /api/student-documents
 * Get student documents with filtering and pagination
 * Accessible by: ADMIN, REGISTRAR
 */
router.get('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      studentId,
      requirementId,
      status,
      search,
      sortBy = 'submittedAt',
      sortOrder = 'DESC'
    } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const offset = (pageNumber - 1) * limitNumber;

    // Build query
    let queryBuilder = studentDocumentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.student', 'student')
      .leftJoinAndSelect('document.requirement', 'requirement')
      .leftJoinAndSelect('document.verifier', 'verifier');

    // Add filters
    if (studentId) {
      queryBuilder = queryBuilder.andWhere('document.studentId = :studentId', { studentId });
    }

    if (requirementId) {
      queryBuilder = queryBuilder.andWhere('document.requirementId = :requirementId', { requirementId });
    }

    if (status) {
      queryBuilder = queryBuilder.andWhere('document.status = :status', { status });
    }

    // Add search functionality
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(document.fileName LIKE :search OR requirement.name LIKE :search OR student.firstName LIKE :search OR student.lastName LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add sorting
    const validSortFields = ['submittedAt', 'verifiedAt', 'fileName', 'status'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'submittedAt';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    
    queryBuilder = queryBuilder.orderBy(`document.${sortField}`, order);

    // Get total count for pagination
    const totalCount = await queryBuilder.getCount();

    // Apply pagination
    const rawDocuments = await queryBuilder
      .skip(offset)
      .take(limitNumber)
      .getMany();

    const documents = rawDocuments.map(doc => ({
      ...doc,
      fileUrl: buildDocumentFileUrl(doc)
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    res.json({
      success: true,
      data: documents,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('❌ Error fetching student documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student documents'
    });
  }
});

/**
 * GET /api/student-documents/student/:studentId
 * Get all documents for a specific student
 * Accessible by: ADMIN, REGISTRAR, STUDENT (own documents only)
 */
router.get('/student/:studentId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const user = req.user;

    // Check if user can access this student's documents
    if (user?.role === UserRole.STUDENT) {
      // Students can only access their own documents
      const student = await studentRepository.findOne({
        where: { userId: user.id }
      });

      if (!student || student.id !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own documents.'
        });
      }
    } else if (![UserRole.ADMIN, UserRole.REGISTRAR].includes(user?.role as UserRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Dweezil's Code - Removed 'verifier' relation to prevent massive SQL query
    // Dweezil's Code - Debug: Explicitly log query to verify isInitial is being fetched
    console.log('🔍 Fetching documents for student:', studentId);
    const rawDocuments = await studentDocumentRepository.find({
      where: { studentId },
      relations: ['requirement', 'requirement.category'],
      order: { submittedAt: 'DESC' }
    });
    
    // Dweezil's Code - Debug: Log first document to verify isInitial field
    if (rawDocuments.length > 0) {
      console.log('🔍 First document from DB:', {
        id: rawDocuments[0].id,
        requirementId: rawDocuments[0].requirementId,
        isInitial: rawDocuments[0].isInitial,
        status: rawDocuments[0].status,
        fileName: rawDocuments[0].fileName
      });
    }

    const documents = rawDocuments.map(doc => ({
      ...doc,
      requirementId: doc.requirementId, // Explicitly include requirementId for frontend matching
      fileUrl: buildDocumentFileUrl(doc)
    }));

    const student = await studentRepository.findOne({
      where: { id: studentId },
      select: ['id', 'documentsSubmitted']
    });

    const jsonSubmitted = Array.isArray(student?.documentsSubmitted) ? student?.documentsSubmitted : [];
    const jsonWithFile = jsonSubmitted.filter(d => !!(d as { fileUrl?: string; filePath?: string }).fileUrl || !!(d as { fileUrl?: string; filePath?: string }).filePath);
    const existingRequirementIds = new Set<string>(
      documents
        .map(d => (d as unknown as { requirementId?: string }).requirementId)
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
    );

    const missingRequirementIds = Array.from(
      new Set(
        jsonWithFile
          .map(d => (d as { id?: string }).id)
          .filter((v): v is string => typeof v === 'string' && v.length > 0 && !existingRequirementIds.has(v))
      )
    );

    const requirementsById = new Map<string, { id: string; name: string }>();
    if (missingRequirementIds.length > 0) {
      const reqs = await documentRequirementRepository.findByIds(missingRequirementIds);
      reqs.forEach(r => requirementsById.set(r.id, { id: r.id, name: r.name }));
    }

    const virtualDocuments = jsonWithFile
      .map(d => {
        const doc = d as unknown as {
          id?: string;
          name?: string;
          fileUrl?: string;
          filePath?: string;
          fileName?: string;
          fileSize?: number;
          submittedDate?: Date | string;
        };
        const requirementId = doc.id;
        if (!requirementId || existingRequirementIds.has(requirementId)) return null;

        const req = requirementsById.get(requirementId);
        const fileUrl = doc.fileUrl || doc.filePath;
        if (!fileUrl) return null;

        const submittedAt = doc.submittedDate ? new Date(doc.submittedDate) : new Date();
        return {
          id: `virtual-${studentId}-${requirementId}`,
          studentId,
          requirementId,
          requirement: req ? { id: req.id, name: req.name } : doc.name ? { id: requirementId, name: doc.name } : undefined,
          fileName: doc.fileName || (req ? req.name : 'document'),
          filePath: fileUrl,
          fileUrl,
          fileSize: doc.fileSize,
          status: DocumentStatus.SUBMITTED,
          submittedAt,
          isVirtual: true
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    res.json({
      success: true,
      data: [...documents, ...virtualDocuments]
    });
  } catch (error) {
    console.error('Error fetching student documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student documents'
    });
  }
});

/**
 * POST /api/student-documents/upload
 * Upload a document for a student
 * Accessible by: ADMIN, REGISTRAR, STUDENT (own documents only)
 */
// Dweezil's Code - Issue #4: Add debug logging to investigate 404 error
router.post('/upload', (req, res, next) => {
  console.log('🎯 UPLOAD ROUTE HIT - Method:', req.method, 'Path:', req.path);
  console.log('🎯 UPLOAD ROUTE - Original URL:', req.originalUrl);
  console.log('🎯 UPLOAD ROUTE - Base URL:', req.baseUrl);
  console.log('🎯 UPLOAD ROUTE - Content-Type:', req.headers['content-type']);
  next();
}, authenticateToken, (req: AuthenticatedRequest, res, next) => {
  console.log('🔐 AUTH PASSED - User:', req.user?.email);
  next();
}, upload.single('document') as unknown as RequestHandler, (req, res, next) => {
  console.log('📎 MULTER PASSED - File:', req.file ? 'YES' : 'NO');
  if (!req.file) {
    console.log('❌ MULTER: No file received!');
  }
  next();
}, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📤 UPLOAD HANDLER EXECUTING');
    console.log('📤 Request body:', req.body);
    console.log('📤 File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'NO FILE');
    
    // Dweezil's Code - Task 3: Accept isInitial parameter from frontend to control document section placement
    const { studentId, requirementId, metadata, isInitial } = req.body;
    const file = req.file;
    const user = req.user;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!studentId || !requirementId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and requirement ID are required'
      });
    }

    // Check if user can upload for this student
    if (user?.role === UserRole.STUDENT) {
      const student = await studentRepository.findOne({
        where: { userId: user.id }
      });

      if (!student || student.id !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only upload documents for yourself.'
        });
      }
    }

    // Validate student and requirement exist
    const [student, requirement] = await Promise.all([
      studentRepository.findOne({ where: { id: studentId } }),
      documentRequirementRepository.findOne({ where: { id: requirementId } })
    ]);

    // Dweezil's Code - Issue #4: Debug - Check query results
    console.log('🔍 Student found:', student ? 'YES' : 'NO');
    console.log('🔍 Requirement found:', requirement ? 'YES' : 'NO');

    if (!student) {
      console.log('❌ Student not found, returning 404');
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (!requirement) {
      console.log('❌ Requirement not found, returning 404');
      return res.status(404).json({
        success: false,
        message: 'Document requirement not found'
      });
    }

    console.log('✅ Student and requirement validated');

    // Dweezil's Code - Issue #4: Debug - Validation rules check
    console.log('🔍 Checking validation rules...');
    
    // Validate file against requirement rules
    if (requirement.validationRules) {
      const rules = requirement.validationRules;
      console.log('🔍 Validation rules found:', rules);
      
      // Check file size
      if (rules.maxFileSize && file.size > rules.maxFileSize) {
        console.log('❌ File size exceeds limit');
        return res.status(400).json({
          success: false,
          message: `File size exceeds maximum allowed size of ${rules.maxFileSize} bytes`
        });
      }

      // Check file type
      if (rules.allowedFileTypes && rules.allowedFileTypes.length > 0) {
        const normalizedAllowedTypes = normalizeAllowedFileTypes(rules.allowedFileTypes);
        if (!normalizedAllowedTypes.includes(file.mimetype)) {
          console.log('❌ File type not allowed');
          return res.status(400).json({
            success: false,
            message: `File type ${file.mimetype} is not allowed. Allowed types: ${rules.allowedFileTypes.join(', ')}`
          });
        }
      }
    }
    
    console.log('✅ Validation passed');

    const useR2 = shouldUseR2();
    let filePath: string;

    if (useR2) {
      const bucket = String(process.env.R2_BUCKET || '').trim();
      if (!bucket) {
        throw new Error('R2_BUCKET is required when UPLOAD_PROVIDER=r2');
      }

      const r2 = getR2Client();
      const key = buildR2ObjectKey({ studentId, requirementId, originalName: file.originalname });
      await r2.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype
        })
      );
      filePath = `r2://${bucket}/${key}`;
    } else {
      // Dweezil's Code - Issue #4: Debug - File system operations
      console.log('📁 Creating uploads directory...');
      const uploadsDir = await resolveWritableUploadsDir();
      console.log('📁 Upload directory path:', uploadsDir);
      console.log('✅ Directory created/verified');

      const fileExtension = toSafeExtension(file.originalname);
      const fileName = `${studentId}_${requirementId}_${Date.now()}${fileExtension}`;
      filePath = path.join(uploadsDir, fileName);
      await fs.writeFile(filePath, file.buffer);
    }

    // Check if document already exists for this student and requirement
    const existingDocument = await studentDocumentRepository.findOne({
      where: { studentId, requirementId }
    });

    let document: StudentDocument;

    if (existingDocument) {
      // Update existing document
      // Delete old file if it exists
      if (existingDocument.filePath) {
        try {
          const r2Info = parseR2Uri(existingDocument.filePath);
          if (r2Info) {
            const r2 = getR2Client();
            await r2.send(new DeleteObjectCommand({ Bucket: r2Info.bucket, Key: r2Info.key }));
          } else if (!existingDocument.filePath.startsWith('http://') && !existingDocument.filePath.startsWith('https://')) {
            await fs.unlink(existingDocument.filePath);
          }
        } catch (_error) {
          console.warn('Could not delete old file:', existingDocument.filePath);
        }
      }

      existingDocument.fileName = file.originalname;
      existingDocument.filePath = filePath;
      existingDocument.fileType = file.mimetype;
      existingDocument.fileSize = file.size;
      existingDocument.status = DocumentStatus.SUBMITTED;
      existingDocument.metadata = metadata ? JSON.parse(metadata) : null;
      existingDocument.submittedAt = new Date();
      existingDocument.verifiedAt = null;
      existingDocument.verifiedBy = null;
      // Dweezil's Code - Task 3: Use isInitial from request if provided, otherwise fall back to requirement.isInitial
      // This allows frontend to control whether document appears in Initial Requirements or Required Documents section
      existingDocument.isInitial = isInitial !== undefined ? (isInitial === 'true' || isInitial === true) : requirement.isInitial;

      document = await studentDocumentRepository.save(existingDocument);
    } else {
      // Create new document
      // Dweezil's Code - Task 3: Use isInitial from request if provided, otherwise fall back to requirement.isInitial
      // This allows frontend to control whether document appears in Initial Requirements or Required Documents section
      document = studentDocumentRepository.create({
        studentId,
        requirementId,
        fileName: file.originalname,
        filePath,
        fileType: file.mimetype,
        fileSize: file.size,
        status: DocumentStatus.SUBMITTED,
        metadata: metadata ? JSON.parse(metadata) : null,
        submittedAt: new Date(),
        isInitial: isInitial !== undefined ? (isInitial === 'true' || isInitial === true) : requirement.isInitial
      });

      document = await studentDocumentRepository.save(document);
    }

    // Fetch complete document with relations
    const completeDocument = await studentDocumentRepository.findOne({
      where: { id: document.id },
      relations: ['requirement', 'student']
    });

    const responseDocument = completeDocument
      ? {
          ...completeDocument,
          fileUrl: buildDocumentFileUrl(completeDocument)
        }
      : null;

    // Dweezil's Code - Issue #4: Debug log before sending response
    console.log('✅ UPLOAD SUCCESS - Sending 201 response');
    console.log('✅ Response document ID:', responseDocument?.id);
    console.log('✅ Response file URL:', responseDocument?.fileUrl);

    res.status(201).json({
      success: true,
      data: responseDocument,
      message: 'Document uploaded successfully'
    });
    
    console.log('✅ RESPONSE SENT');
  } catch (error) {
    console.error('❌ Error uploading document:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/:id/signed-url', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const document = await studentDocumentRepository.findOne({
      where: { id },
      relations: ['student']
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    if (user?.role === UserRole.STUDENT) {
      const student = await studentRepository.findOne({
        where: { userId: user.id }
      });

      if (!student || student.id !== document.studentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (![UserRole.ADMIN, UserRole.REGISTRAR].includes(user?.role as UserRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const normalizedPath = document.filePath.replace(/\\/g, '/');

    if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
      return res.json({
        success: true,
        data: {
          url: normalizedPath,
          fileName: document.fileName,
          fileType: document.fileType,
          expiresInSeconds: null,
          requiresAuthDownload: false
        }
      });
    }

    const r2Info = parseR2Uri(normalizedPath);
    if (r2Info) {
      const safeName = String(document.fileName || 'document').replace(/"/g, '');
      const r2 = getR2Client();
      const expiresInSeconds = 300;
      const signedUrl = await getSignedUrl(
        r2,
        new GetObjectCommand({
          Bucket: r2Info.bucket,
          Key: r2Info.key,
          ResponseContentType: document.fileType || undefined,
          ResponseContentDisposition: `inline; filename="${safeName}"`
        }),
        { expiresIn: expiresInSeconds }
      );

      return res.json({
        success: true,
        data: {
          url: signedUrl,
          fileName: document.fileName,
          fileType: document.fileType,
          expiresInSeconds,
          requiresAuthDownload: false
        }
      });
    }

    return res.json({
      success: true,
      data: {
        url: `/api/student-documents/${document.id}/download`,
        fileName: document.fileName,
        fileType: document.fileType,
        expiresInSeconds: null,
        requiresAuthDownload: true
      }
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate signed URL'
    });
  }
});

/**
 * GET /api/student-documents/:id/download
 * Download a document file
 * Accessible by: ADMIN, REGISTRAR, STUDENT (own documents only)
 */
router.get('/:id/download', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const document = await studentDocumentRepository.findOne({
      where: { id },
      relations: ['student']
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user can access this document
    if (user?.role === UserRole.STUDENT) {
      const student = await studentRepository.findOne({
        where: { userId: user.id }
      });

      if (!student || student.id !== document.studentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (![UserRole.ADMIN, UserRole.REGISTRAR].includes(user?.role as UserRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const normalizedPath = document.filePath.replace(/\\/g, '/');

    if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
      return res.redirect(normalizedPath);
    }

    const r2Info = parseR2Uri(normalizedPath);
    if (r2Info) {
      const safeName = String(document.fileName || 'document').replace(/"/g, '');
      const r2 = getR2Client();
      const signedUrl = await getSignedUrl(
        r2,
        new GetObjectCommand({
          Bucket: r2Info.bucket,
          Key: r2Info.key,
          ResponseContentType: document.fileType || undefined,
          ResponseContentDisposition: `inline; filename="${safeName}"`
        }),
        { expiresIn: 60 }
      );
      return res.redirect(signedUrl);
    }

    try {
      await fs.access(document.filePath);
    } catch (_error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
    res.setHeader('Content-Type', document.fileType);
    return res.sendFile(path.resolve(document.filePath));
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document'
    });
  }
});

/**
 * PATCH /api/student-documents/:id/verify
 * Verify or reject a document
 * Accessible by: ADMIN, REGISTRAR
 */
router.patch('/:id/verify', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const user = req.user;

    if (!status || ![DocumentStatus.VERIFIED, DocumentStatus.REJECTED].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status (VERIFIED or REJECTED) is required'
      });
    }

    const document = await studentDocumentRepository.findOne({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Update document status
    document.status = status;
    document.verifiedAt = new Date();
    document.verifiedBy = user?.id || null;

    // Update metadata with verification notes if provided
    if (notes) {
      const currentMetadata = document.metadata || {};
      document.metadata = {
        ...currentMetadata,
        verificationNotes: notes
      } as DocumentMetadata;
    }

    const updatedDocument = await studentDocumentRepository.save(document);

    // Dweezil's Code - Removed 'verifier' relation to prevent massive SQL query
    // Fetch complete document with relations
    const completeDocument = await studentDocumentRepository.findOne({
      where: { id: updatedDocument.id },
      relations: ['requirement', 'student']
    });

    res.json({
      success: true,
      data: completeDocument,
      message: `Document ${status.toLowerCase()} successfully`
    });
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify document'
    });
  }
});

/**
 * DELETE /api/student-documents/:id
 * Delete a document
 * Accessible by: ADMIN, REGISTRAR
 */
router.delete('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const document = await studentDocumentRepository.findOne({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete file
    if (document.filePath) {
      try {
        const normalizedPath = document.filePath.replace(/\\/g, '/');
        const r2Info = parseR2Uri(normalizedPath);
        if (r2Info) {
          const r2 = getR2Client();
          await r2.send(new DeleteObjectCommand({ Bucket: r2Info.bucket, Key: r2Info.key }));
        } else if (!normalizedPath.startsWith('http://') && !normalizedPath.startsWith('https://')) {
          await fs.unlink(document.filePath);
        }
      } catch (_error) {
        console.warn('Could not delete file:', document.filePath);
      }
    }

    // Delete document record
    await studentDocumentRepository.remove(document);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
});

/**
 * GET /api/student-documents/stats
 * Get document submission statistics
 * Accessible by: ADMIN, REGISTRAR
 */
router.get('/stats', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gradeLevel, categoryId } = req.query;

    let queryBuilder = studentDocumentRepository
      .createQueryBuilder('document')
      .leftJoin('document.student', 'student')
      .leftJoin('document.requirement', 'requirement');

    if (gradeLevel) {
      queryBuilder = queryBuilder.andWhere('student.gradeLevel = :gradeLevel', { gradeLevel });
    }

    if (categoryId) {
      queryBuilder = queryBuilder.andWhere('requirement.categoryId = :categoryId', { categoryId });
    }

    const [
      totalDocuments,
      submittedDocuments,
      verifiedDocuments,
      rejectedDocuments
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('document.status = :status', { status: DocumentStatus.SUBMITTED }).getCount(),
      queryBuilder.clone().andWhere('document.status = :status', { status: DocumentStatus.VERIFIED }).getCount(),
      queryBuilder.clone().andWhere('document.status = :status', { status: DocumentStatus.REJECTED }).getCount()
    ]);

    const pendingDocuments = submittedDocuments;
    const completionRate = totalDocuments > 0 ? (verifiedDocuments / totalDocuments) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalDocuments,
        submittedDocuments,
        verifiedDocuments,
        rejectedDocuments,
        pendingDocuments,
        completionRate: Math.round(completionRate * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching document stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document statistics'
    });
  }
});

// Dweezil's Code - Issue #4: Catch-all route for debugging 404 errors
router.all('*', (req, res) => {
  console.log('❌ STUDENT-DOCUMENTS CATCH-ALL HIT');
  console.log('❌ Method:', req.method);
  console.log('❌ Path:', req.path);
  console.log('❌ Original URL:', req.originalUrl);
  console.log('❌ Base URL:', req.baseUrl);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    debug: {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      availableRoutes: [
        'GET /api/student-documents',
        'GET /api/student-documents/student/:studentId',
        'POST /api/student-documents/upload',
        'GET /api/student-documents/:id/download',
        'PATCH /api/student-documents/:id/verify',
        'DELETE /api/student-documents/:id',
        'GET /api/student-documents/stats'
      ]
    }
  });
});

export default router;
