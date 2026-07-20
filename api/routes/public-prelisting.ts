import { Router, Request, Response, NextFunction } from 'express';
import { AppDataSource, initializeDatabase } from '../config/database';
import { User, UserRole } from '../entities/User';
import { Student, Gender, StudentStatus, RegistrationStatus, DocumentRequirement } from '../entities/Student';
// intentionally unused import removed
import bcrypt from 'bcrypt';
import { getPublicPreListingRequirements } from '../utils/documentRequirements';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { put } from '@vercel/blob';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { emailService } from '../services/emailService';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    (req as Request & { fileValidationError?: string }).fileValidationError = 'Invalid file type';
    cb(null, false);
  }
});

const rateBuckets = new Map<string, { count: number; reset: number }>();
function rateLimit(maxPerMinute: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req.ip || req.headers['x-forwarded-for'] as string || 'unknown').toString();
    const now = Date.now();
    const bucket = rateBuckets.get(key) || { count: 0, reset: now + 60_000 };
    if (now > bucket.reset) {
      bucket.count = 0;
      bucket.reset = now + 60_000;
    }
    bucket.count += 1;
    rateBuckets.set(key, bucket);
    if (bucket.count > maxPerMinute) {
      res.status(429).json({ success: false, message: 'Too many requests' });
      return;
    }
    next();
  };
}

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

async function verifyTurnstile(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    next();
    return;
  }
  const token = (req.body?.turnstileToken || req.body?.['cf-turnstile-response'] || req.headers['x-turnstile-token']) as string;
  if (!token) {
    res.status(400).json({ success: false, message: 'Turnstile token missing' });
    return;
  }
  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    const remoteIp = (req.ip || '') as string;
    if (remoteIp) params.append('remoteip', remoteIp);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const data = (await r.json()) as unknown as TurnstileVerifyResponse;
    if (data?.success) {
      next();
      return;
    }
    res.status(401).json({ success: false, message: 'Turnstile verification failed' });
  } catch (_error) {
    res.status(500).json({ success: false, message: 'Turnstile verification error' });
  }
}

router.get('/pre-listing/requirements', async (_req: Request, res: Response) => {
  try {
    // For Pre-listing, we use the static definition of requirements to enforce the specific grouping logic
    // (Freshmen, Grade 12, ALS) and split requirements requested by business rules.
    // We do NOT fetch from DB here because the DB might not have the group metadata or the split structure.
    const requirements = getPublicPreListingRequirements();

    // Disable caching temporarily to ensure DB changes are reflected immediately
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({ success: true, data: requirements });
  } catch (error) {
    console.error('Error fetching pre-listing requirements:', error);
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, data: getPublicPreListingRequirements() });
  }
});

router.post('/pre-listing', rateLimit(20), verifyTurnstile, async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      firstName: string;
      lastName: string;
      email: string;
      dateOfBirth: string;
      gender: Gender;
      address: string;
      phoneNumber?: string;
      remarks?: string;
    };
    const { firstName, lastName, dateOfBirth, gender, address, phoneNumber, remarks } = body;
    const email = (body.email || '').trim().toLowerCase();
    const normalizedFirstName = (firstName || '').trim().toUpperCase();
    const normalizedLastName = (lastName || '').trim().toUpperCase();

    if (!normalizedFirstName || !normalizedLastName || !email || !dateOfBirth || !gender || !address) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    await initializeDatabase();

    const userRepo = AppDataSource.getRepository(User);
    const studentRepo = AppDataSource.getRepository(Student);

    const existing = await userRepo
      .createQueryBuilder('u')
      .where('LOWER(TRIM(u.email)) = LOWER(TRIM(:email))', { email })
      .leftJoinAndSelect('u.student', 'student')
      .getOne();

    let savedUser: User;

    if (existing) {
      if (existing.student) {
        res.status(400).json({ success: false, message: 'Email already registered' });
        return;
      }
      // Reuse existing user if no student profile exists (orphaned user)
      savedUser = existing;
      // Update user details if needed
      savedUser.firstName = normalizedFirstName;
      savedUser.lastName = normalizedLastName;
      await userRepo.save(savedUser);
    } else {
      const baseUsername = email.split('@')[0];
      let username = baseUsername;
      let suffix = 1;
      while (await userRepo.findOne({ where: { username } })) {
        username = `${baseUsername}${suffix++}`;
      }

      const tempPassword = 'TempPass123!';
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      const user = userRepo.create({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email,
        username,
        password: hashedPassword,
        position: 'Student',
        role: UserRole.STUDENT,
        isActive: false
      });
      
      try {
        savedUser = await userRepo.save(user);
      } catch (_error) {
        const err = _error as { code?: string; message?: string; sqlMessage?: string };
        if (err && err.code === 'ER_DUP_ENTRY') {
          const isEmail = (err.sqlMessage || err.message || '').toLowerCase().includes('email');
          const isUsername = (err.sqlMessage || err.message || '').toLowerCase().includes('username');
          res.status(400).json({ success: false, message: isEmail ? 'Email already registered' : isUsername ? 'Username already exists' : 'Duplicate entry' });
          return;
        }
        throw _error;
      }
    }

    // Use static requirements for pre-listing to ensure correct grouping and split requirements
    const requirements = getPublicPreListingRequirements();

    const student = studentRepo.create({
      userId: savedUser.id,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      address,
      phoneNumber,
      notes: remarks,
      status: StudentStatus.PRE_REGISTERED,
      registrationStatus: RegistrationStatus.PRE_REGISTERED,
      documentsRequired: requirements,
      documentsSubmitted: [],
      balance: 0
    });
    const savedStudent = await studentRepo.save(student);

    // Send email notifications
    try {
      await emailService.sendPreListingConfirmation({
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email,
        studentId: savedStudent.studentId || savedStudent.id
      });

      await emailService.sendNewPreListingNotificationToAdmin({
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email
      });
    } catch (emailError) {
      console.error('Failed to send pre-listing emails:', emailError);
      // Don't fail the request if email fails
    }

    const response = await studentRepo.findOne({ where: { id: savedStudent.id }, relations: ['user'] });
    res.status(201).json({ success: true, message: 'Pre-listing created', data: response });
  } catch (_error) {
    const err = _error as { message?: string; code?: string; errno?: number; sqlMessage?: string };
    const detail = {
      message: err?.message,
      code: err?.code,
      errno: err?.errno,
      sqlMessage: err?.sqlMessage
    };
    console.error('pre-listing-create-error', detail);
    res.status(500).json({ success: false, message: 'Failed to create pre-listing' });
  }
});

export default router;

// Public screenshot upload for pre-listing
router.post('/pre-listing/upload', rateLimit(10), verifyTurnstile, (req: Request, res: Response) => {
  upload.single('screenshot')(req as Request, res as Response, async (err: unknown) => {
    if (err) {
      const e = err as { code?: string; message?: string };
      const message = e.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 8MB)' : e.message || 'Upload error';
      res.status(400).json({ success: false, message });
      return;
    }
    try {
      const { studentId, requirementId } = req.body as { studentId: string; requirementId: string };
      const file = (req as Request & { file?: Express.Multer.File }).file;
      const typeError = (req as Request & { fileValidationError?: string }).fileValidationError;

      if (!studentId || !requirementId) {
        res.status(400).json({ success: false, message: 'studentId and requirementId are required' });
        return;
      }
      if (typeError) {
        res.status(400).json({ success: false, message: typeError });
        return;
      }
      if (!file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      await initializeDatabase();
      const studentRepo = AppDataSource.getRepository(Student);
      
      // Initial check (fast fail)
      const student = await studentRepo.findOne({ where: { id: studentId } });
      if (!student) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }

      const requirements = (student.documentsRequired || []) as DocumentRequirement[];
      const exists = requirements.find(r => r.id === requirementId);
      if (!exists) {
        res.status(400).json({ success: false, message: 'Requirement not found for this student' });
        return;
      }

      const ext = path.extname(file.originalname);
      const fname = `${studentId}_${requirementId}_${Date.now()}${ext}`;

      let storedUrl: string | null = null;
      const useBlob = !!(process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_RW_TOKEN);
      const useR2 = (process.env.UPLOAD_PROVIDER || '').toLowerCase() === 'r2' && !!process.env.R2_BUCKET;

      if (useR2) {
        const accountId = process.env.R2_ACCOUNT_ID as string;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID as string;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY as string;
        const bucket = process.env.R2_BUCKET as string;
        const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

        const s3 = new S3Client({
          region: 'auto',
          endpoint,
          forcePathStyle: true,
          credentials: { accessKeyId, secretAccessKey }
        });

        const key = `prelisting/${fname}`;
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: file.buffer, ContentType: file.mimetype }));
        const publicDomain = process.env.R2_PUBLIC_DOMAIN || endpoint.replace('.cloudflarestorage.com', '.r2.dev') + `/${bucket}`;
        storedUrl = `${publicDomain}/${key}`;
      } else if (useBlob) {
        const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_RW_TOKEN;
        if (!token) {
          throw new Error('Blob storage token not configured');
        }
        const result = await put(`prelisting/${fname}`, file.buffer, { access: 'public', token });
        storedUrl = result.url;
      } else {
        const uploadsRoot = process.env.NODE_ENV === 'production'
          ? path.resolve(process.cwd(), 'uploads')
          : path.join(__dirname, 'public', 'uploads');
        const uploadsDir = path.join(uploadsRoot, 'prelisting');
        await fs.mkdir(uploadsDir, { recursive: true });
        const fpath = path.join(uploadsDir, fname);
        await fs.writeFile(fpath, file.buffer);
        storedUrl = `/uploads/prelisting/${fname}`;
      }

      // Use transaction to prevent race conditions when updating arrays
      const doc = await AppDataSource.transaction(async transactionalEntityManager => {
        // Re-fetch student with lock
        const freshStudent = await transactionalEntityManager.findOne(Student, { 
          where: { id: studentId },
          lock: { mode: "pessimistic_write" }
        });

        if (!freshStudent) {
          throw new Error('Student not found during update');
        }

        const freshRequirements = (freshStudent.documentsRequired || []) as DocumentRequirement[];
        const freshExists = freshRequirements.find(r => r.id === requirementId);
        
        if (!freshExists) {
           throw new Error('Requirement not found during update');
        }

        const freshSubmitted = (freshStudent.documentsSubmitted || []) as DocumentRequirement[];
        
        const newDoc: DocumentRequirement = {
          ...freshExists,
          submitted: true,
          fileName: file.originalname,
          fileSize: file.size,
          fileUrl: storedUrl || undefined,
          submittedDate: new Date()
        };

        const updatedSubmitted: DocumentRequirement[] = freshSubmitted.filter(d => d.id !== requirementId).concat(newDoc);
        const updatedRequired: DocumentRequirement[] = freshRequirements.map(r => r.id === requirementId ? { ...r, submitted: true } : r);

        freshStudent.documentsSubmitted = updatedSubmitted;
        freshStudent.documentsRequired = updatedRequired;
        
        await transactionalEntityManager.save(freshStudent);
        return newDoc;
      });

      res.status(201).json({ success: true, message: 'Screenshot uploaded', data: doc });
    } catch (_error) {
      const message = (_error as { message?: string })?.message || 'Failed to upload screenshot';
      res.status(500).json({ success: false, message });
    }
  });
});

// Public fetch of pre-listing details
router.get('/pre-listing/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await initializeDatabase();
    const studentRepo = AppDataSource.getRepository(Student);
    const student = await studentRepo.findOne({ where: { id }, relations: ['user'] });
    if (!student) {
      res.status(404).json({ success: false, message: 'Pre-listing not found' });
      return;
    }
    const result = {
      id: student.id,
      user: {
        firstName: student.user?.firstName,
        lastName: student.user?.lastName,
        email: student.user?.email,
        username: student.user?.username
      },
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      address: student.address,
      phoneNumber: student.phoneNumber,
      remarks: student.notes,
      documentsRequired: student.documentsRequired,
      documentsSubmitted: student.documentsSubmitted,
      createdAt: student.createdAt
    };
    res.json({ success: true, data: result });
  } catch (_error) {
    res.status(500).json({ success: false, message: 'Failed to fetch pre-listing details' });
  }
});
