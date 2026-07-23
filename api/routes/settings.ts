import { Router, Request, Response, IRouter, RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { put, del } from '@vercel/blob';
import { AppDataSource, initializeDatabase } from '../config/database';
import { Settings } from '../entities/Settings';
import { AcademicYear } from '../entities/AcademicYear';
import { authenticateToken, requireAdmin, AuthenticatedRequestWithFile } from '../middleware/auth';
import { getCurrentAcademicYear } from '../utils/academicTerm';
import { resolveUploadsDir } from '../utils/uploads';

// Interface for settings object structure
interface SettingsObject {
  [key: string]: {
    value: string;
    description: string;
    category: string;
  };
}

const router: IRouter = Router();

// Helper function to get repository safely
const getSettingsRepository = async () => {
  // Try to initialize database if not already done
  if (!AppDataSource.isInitialized) {
    try {
      await initializeDatabase();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error('Database connection failed');
    }
  }
  
  return AppDataSource.getRepository(Settings);
};

// Configure multer for logo uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and SVG files are allowed.'));
    }
  },
});

// Authentication middleware is now imported from ../middleware/auth

/**
 * GET /api/settings/public
 * Get public settings (no authentication required)
 */
router.get('/public', async (req: Request, res: Response) => {
  try {
    if (!AppDataSource.isInitialized) {
      initializeDatabase();
      const defaults = [
        { id: 0, key: 'school_name', value: 'Benedict College', description: '', category: 'general', editable: false, createdAt: '', updatedAt: '' },
        { id: 0, key: 'school_motto', value: 'Excellence in Education', description: '', category: 'general', editable: false, createdAt: '', updatedAt: '' },
        { id: 0, key: 'school_logo', value: '', description: '', category: 'appearance', editable: false, createdAt: '', updatedAt: '' },
      ];
      return res.json({ success: true, settings: defaults });
    }

    const settingsRepository = await getSettingsRepository();
    const settings = await settingsRepository.find({
      select: ['id', 'key', 'value', 'description', 'category', 'editable', 'createdAt', 'updatedAt'],
      order: { category: 'ASC', key: 'ASC' }
    });

    res.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

/**
 * GET /api/settings
 * Get all settings (public endpoint for basic settings like school name)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const settingsRepository = await getSettingsRepository();
    const settings = await settingsRepository.find({
      select: ['key', 'value', 'description', 'category'],
      order: { category: 'ASC', key: 'ASC' }
    });

    // Convert to key-value object for easier frontend consumption
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = {
        value: setting.value,
        description: setting.description || '',
        category: setting.category
      };
      return acc;
    }, {} as SettingsObject);

    res.json({
      success: true,
      data: settingsObject
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

/**
 * GET /api/settings/admin
 * Get all settings with admin details (requires admin authentication)
 */
router.get('/admin', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settingsRepository = await getSettingsRepository();
    const settings = await settingsRepository.find({
      order: { category: 'ASC', key: 'ASC' }
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

/**
 * PUT /api/settings/:key
 * Update a specific setting (requires admin authentication)
 */
router.put('/:key', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!value && value !== '') {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }

    const settingsRepository = await getSettingsRepository();
    
    // Find the setting or create if it doesn't exist
    let setting = await settingsRepository.findOne({ where: { key } });
    
    if (!setting) {
      // Create new setting if it doesn't exist
      setting = settingsRepository.create({
        key,
        value,
        description: `Auto-created setting for ${key}`,
        category: 'school_info',
        editable: true
      });
    } else {
      // Check if existing setting is editable
      if (!setting.editable) {
        return res.status(403).json({
          success: false,
          message: 'This setting is not editable'
        });
      }
      // Update the existing setting
      setting.value = value;
    }

    await settingsRepository.save(setting);

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: setting
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting'
    });
  }
});

/**
 * POST /api/settings
 * Create a new setting (requires admin authentication)
 */
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key, value, description, category = 'general' } = req.body;

    if (!key || !value) {
      return res.status(400).json({
        success: false,
        message: 'Key and value are required'
      });
    }

    const settingsRepository = await getSettingsRepository();
    
    // Check if setting already exists
    const existingSetting = await settingsRepository.findOne({ where: { key } });
    if (existingSetting) {
      return res.status(409).json({
        success: false,
        message: 'Setting with this key already exists'
      });
    }

    // Create new setting
    const newSetting = settingsRepository.create({
      key,
      value,
      description,
      category
    });

    await settingsRepository.save(newSetting);

    res.status(201).json({
      success: true,
      message: 'Setting created successfully',
      data: newSetting
    });
  } catch (error) {
    console.error('Error creating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create setting'
    });
  }
});

/**
 * POST /api/settings/logo
 * Upload school logo (requires admin authentication)
 * Uses Vercel Blob in production, local file storage in development
 */
router.post('/logo', authenticateToken, requireAdmin, upload.single('logo') as unknown as RequestHandler, async (req: AuthenticatedRequestWithFile, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const settingsRepository = await getSettingsRepository();
    
    // Get existing logo setting to delete old file if it exists
    let logoSetting = await settingsRepository.findOne({ where: { key: 'school_logo' } });
    
    // Dweezil's Code - Determine if we should use Vercel Blob or local storage
    // Only use Vercel Blob if the token is properly configured (not a placeholder)
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const isValidBlobToken = blobToken && 
                            blobToken !== 'vercel_blob_rw_your_token_here' && 
                            blobToken.startsWith('vercel_blob_rw_') &&
                            blobToken.length > 20;
    const useVercelBlob = isValidBlobToken;
    
    let logoUrl: string;

    if (useVercelBlob) {
      console.log('Using Vercel Blob storage for logo upload');

      // Delete old logo from Vercel Blob if it exists
      if (logoSetting && logoSetting.value && logoSetting.value.startsWith('https://')) {
        try {
          await del(logoSetting.value, { token: blobToken });
        } catch (deleteError) {
          console.warn('Failed to delete old logo from blob storage:', deleteError);
          // Continue with upload even if deletion fails
        }
      }

      // Generate unique filename
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `logo-${Date.now()}${fileExtension}`;

      console.log('Attempting to upload to Vercel Blob:', { fileName, size: req.file.buffer.length, mimetype: req.file.mimetype });
      
      // Upload to Vercel Blob
      const blob = await put(fileName, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
        token: blobToken,
      });

      logoUrl = blob.url;
      console.log('Logo uploaded successfully to Vercel Blob:', logoUrl);
    } else {
      console.log('Using local file storage for logo upload (BLOB_READ_WRITE_TOKEN not configured)');
      console.warn('WARNING: Local uploads will not persist on Vercel deployments!');
      
      // Delete old logo from local storage if it exists
      if (logoSetting && logoSetting.value && logoSetting.value.startsWith('/uploads/')) {
        const storedPath = logoSetting.value.split('?')[0];
        const oldFilePath = path.join(resolveUploadsDir(), path.basename(storedPath));
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log('Deleted old logo from local storage:', oldFilePath);
          } catch (deleteError) {
            console.warn('Failed to delete old logo from local storage:', deleteError);
          }
        }
      }

      // Ensure uploads directory exists (relative to project root)
      const uploadsDir = resolveUploadsDir();
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Created uploads directory:', uploadsDir);
      }

      // Generate unique filename
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `logo-${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      // Write file to disk
      fs.writeFileSync(filePath, req.file.buffer);
      
      // Store relative URL path
      logoUrl = `/uploads/${fileName}`;
      console.log('Logo uploaded successfully to local storage:', logoUrl);
    }
    
    if (logoSetting) {
      // Update existing setting
      logoSetting.value = logoUrl;
      await settingsRepository.save(logoSetting);
    } else {
      // Create new setting
      logoSetting = settingsRepository.create({
        key: 'school_logo',
        value: logoUrl,
        description: 'School logo image',
        category: 'appearance',
        editable: true
      });
      await settingsRepository.save(logoSetting);
    }

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logoUrl: logoUrl,
        setting: logoSetting,
        debug: {
          storageMethod: useVercelBlob ? 'vercel-blob' : 'local-filesystem',
          hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
          env: process.env.NODE_ENV
        }
      }
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    console.error('Upload error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      blobTokenConfigured: !!process.env.BLOB_READ_WRITE_TOKEN,
      blobTokenValid: process.env.BLOB_READ_WRITE_TOKEN !== 'vercel_blob_rw_your_token_here',
      nodeEnv: process.env.NODE_ENV
    });
    
    // Dweezil's Code - Provide specific error messages for common issues
    let errorMessage = 'Failed to upload logo';
    if (error instanceof Error) {
      if (error.message.includes('ENOENT') || error.message.includes('EACCES')) {
        errorMessage = 'File system error. Please check server permissions.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error while uploading. Please try again.';
      } else if (error.message.includes('size') || error.message.includes('large')) {
        errorMessage = 'File too large. Please use a file smaller than 2MB.';
      } else if (error.message.includes('store does not exist') || error.message.includes('BlobStoreNotFoundError')) {
        errorMessage = 'Vercel Blob storage not configured. Please configure BLOB_READ_WRITE_TOKEN in .env or use local storage.';
      } else {
        errorMessage = error.message;
      }
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

/**
 * DELETE /api/settings/logo
 * Remove school logo (requires admin authentication)
 */
router.delete('/logo', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settingsRepository = await getSettingsRepository();
    const logoSetting = await settingsRepository.findOne({ where: { key: 'school_logo' } });
    
    if (!logoSetting) {
      return res.status(404).json({
        success: false,
        message: 'No logo found'
      });
    }

    // Delete file from Vercel Blob if it's a blob URL
    if (logoSetting.value && logoSetting.value.startsWith('https://')) {
      try {
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORAGE_TOKEN || process.env.VERCEL_BLOB_RW_TOKEN;
        await del(logoSetting.value, { token: blobToken });
        console.log('Deleted logo from Vercel Blob:', logoSetting.value);
      } catch (deleteError) {
        console.warn('Failed to delete logo from blob storage:', deleteError);
        // Continue with database removal even if blob deletion fails
      }
    }
    // For local files, delete from disk
    else if (logoSetting.value && logoSetting.value.startsWith('/uploads/')) {
      const storedPath = logoSetting.value.split('?')[0];
      const filePath = path.join(resolveUploadsDir(), path.basename(storedPath));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log('Deleted logo from local storage:', filePath);
        } catch (deleteError) {
          console.warn('Failed to delete logo from local storage:', deleteError);
        }
      }
    }

    // Remove setting from database
    await settingsRepository.remove(logoSetting);

    res.json({
      success: true,
      message: 'Logo removed successfully'
    });
  } catch (error) {
    console.error('Error removing logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove logo'
    });
  }
});

/**
 * GET /api/settings/password-requirements
 * Get password requirements for client-side validation (public endpoint)
 */
router.get('/password-requirements', async (req: Request, res: Response) => {
  try {
    const { getPasswordRequirements } = await import('../middleware/authConfig');
    const requirements = await getPasswordRequirements();
    
    res.json({
      success: true,
      data: requirements
    });
  } catch (error) {
    console.error('Error fetching password requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch password requirements'
    });
  }
});

/**
 * GET /api/settings/academic-year
 * Get current academic year setting (public endpoint)
 * Now uses the new AcademicYear entity
 */
router.get('/academic-year', async (req: Request, res: Response) => {
  try {
    // Try to initialize database if not already done
    if (!AppDataSource.isInitialized) {
      try {
        await initializeDatabase();
      } catch (error) {
        console.error('Failed to initialize database:', error);
        throw new Error('Database connection failed');
      }
    }

    const year = await getCurrentAcademicYear();
    const academicYearRepository = AppDataSource.getRepository(AcademicYear);
    const currentYear = await academicYearRepository.findOne({ where: { year } });

    if (!currentYear) return res.json({ year });
    res.json(currentYear);
  } catch (error) {
    console.error('Error fetching current academic year:', error);
    res.status(500).json({ error: 'Failed to fetch current academic year' });
  }
});

/**
 * PUT /api/settings/academic-year
 * Update academic year setting (requires admin authentication)
 * Now uses the new AcademicYear entity
 */
router.put('/academic-year', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { year } = req.body;

    if (!year) {
      return res.status(400).json({
        error: 'Academic year is required'
      });
    }

    // Validate year format
    if (!AcademicYear.validateYearFormat(year)) {
      return res.status(400).json({ 
        error: 'Invalid year format. Use YYYY-YYYY format (e.g., 2024-2025)' 
      });
    }

    // Try to initialize database if not already done
    if (!AppDataSource.isInitialized) {
      try {
        await initializeDatabase();
      } catch (error) {
        console.error('Failed to initialize database:', error);
        throw new Error('Database connection failed');
      }
    }

    const academicYearRepository = AppDataSource.getRepository(AcademicYear);

    // Find the academic year to set as current
    const academicYear = await academicYearRepository.findOne({
      where: { year }
    });

    if (!academicYear) {
      return res.status(404).json({
        error: 'Academic year not found. Please create it first.'
      });
    }

    // Start transaction to ensure only one active year
    await AppDataSource.transaction(async (manager) => {
      // First, deactivate all academic years
      await manager.update(AcademicYear, {}, { isActive: false });

      // Then activate the selected year
      await manager.update(
        AcademicYear, 
        { year }, 
        { isActive: true }
      );
    });

    res.json({
      success: true,
      message: 'Academic year updated successfully',
      year: year
    });
  } catch (error) {
    console.error('Error updating academic year:', error);
    res.status(500).json({
      error: 'Failed to update academic year'
    });
  }
});

export default router;
