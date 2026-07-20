import express, { Request, Response } from 'express';
import { PdfGeneratorService } from '../services/PdfGeneratorService';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { UserRole } from '../entities/User';
import { AppDataSource } from '../config/database';
import { Course } from '../entities/Course';
import { Department } from '../entities/Department';

const router = express.Router();
const pdfService = new PdfGeneratorService();

// Get available courses for PDF generation
router.get('/courses', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR, UserRole.TEACHER]), async (req: Request, res: Response) => {
  try {
    const courseRepository = AppDataSource.getRepository(Course);
    const courses = await courseRepository.find({
      where: { isActive: true },
      relations: ['department'],
      select: ['id', 'courseCode', 'name', 'description'],
      order: { courseCode: 'ASC' }
    });

    res.json({
      success: true,
      data: courses.map(course => ({
        id: course.id,
        code: course.courseCode,
        name: course.name,
        description: course.description,
        department: {
          name: course.department.name,
          code: course.department.code
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
});

// Get available departments for PDF generation
router.get('/departments', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR]), async (req: Request, res: Response) => {
  try {
    const departmentRepository = AppDataSource.getRepository(Department);
    const departments = await departmentRepository.find({
      where: { isActive: true },
      select: ['id', 'name', 'code', 'description'],
      order: { name: 'ASC' }
    });

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments'
    });
  }
});

// Generate syllabus PDF for a specific course
router.post('/syllabus/:courseCode', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR, UserRole.TEACHER]), async (req: Request, res: Response) => {
  try {
    const { courseCode } = req.params;
    const { academicYear } = req.body;

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Academic year is required'
      });
    }

    // Validate course exists
    const courseRepository = AppDataSource.getRepository(Course);
    const course = await courseRepository.findOne({
      where: { courseCode, isActive: true },
      relations: ['department']
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: `Course ${courseCode} not found`
      });
    }

    console.log(`Generating syllabus PDF for ${courseCode} - ${academicYear}`);
    const pdfBuffer = await pdfService.generateSyllabusPdf(courseCode, academicYear);

    const filename = `${courseCode}_Syllabus_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating syllabus PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate syllabus PDF',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate prospectus PDF for a department
router.post('/prospectus/:departmentCode', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR]), async (req: Request, res: Response) => {
  try {
    const { departmentCode } = req.params;
    const { academicYear } = req.body;

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Academic year is required'
      });
    }

    // Validate department exists
    const departmentRepository = AppDataSource.getRepository(Department);
    const department = await departmentRepository.findOne({
      where: { code: departmentCode, isActive: true }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: `Department ${departmentCode} not found`
      });
    }

    console.log(`Generating prospectus PDF for ${departmentCode} - ${academicYear}`);
    const pdfBuffer = await pdfService.generateProspectusPdf(departmentCode, academicYear);

    const filename = `${departmentCode}_Prospectus_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating prospectus PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate prospectus PDF',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Preview syllabus data (without generating PDF)
router.get('/preview/syllabus/:courseCode', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR, UserRole.TEACHER]), async (req: Request, res: Response) => {
  try {
    const { courseCode } = req.params;
    const { academicYear } = req.query;

    if (!academicYear || typeof academicYear !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Academic year is required'
      });
    }

    // Create a temporary service instance to get data
    const tempService = new PdfGeneratorService();
    const syllabusData = await tempService.getSyllabusData(courseCode, academicYear);

    res.json({
      success: true,
      data: syllabusData
    });
  } catch (error) {
    console.error('Error previewing syllabus data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview syllabus data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Preview prospectus data (without generating PDF)
router.get('/preview/prospectus/:departmentCode', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR]), async (req: Request, res: Response) => {
  try {
    const { departmentCode } = req.params;
    const { academicYear } = req.query;

    if (!academicYear || typeof academicYear !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Academic year is required'
      });
    }

    // Create a temporary service instance to get data
    const tempService = new PdfGeneratorService();
    const prospectusData = await tempService.getProspectusData(departmentCode, academicYear);

    res.json({
      success: true,
      data: prospectusData
    });
  } catch (error) {
    console.error('Error previewing prospectus data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview prospectus data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available academic years
router.get('/academic-years', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.REGISTRAR, UserRole.TEACHER]), async (req: Request, res: Response) => {
  try {
    // Get distinct academic years from course sections
    const result = await AppDataSource.query(`
      SELECT DISTINCT academicYear 
      FROM course_sections 
      WHERE isActive = 1 
      ORDER BY academicYear DESC
    `);

    const academicYears = result.map((row: { academicYear: string }) => row.academicYear);

    // If no academic years found, provide current and next year as defaults
    if (academicYears.length === 0) {
      const currentYear = new Date().getFullYear();
      academicYears.push(`${currentYear}-${currentYear + 1}`);
      academicYears.push(`${currentYear + 1}-${currentYear + 2}`);
    }

    res.json({
      success: true,
      data: academicYears
    });
  } catch (error) {
    console.error('Error fetching academic years:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch academic years'
    });
  }
});

// Health check for PDF service
router.get('/health', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Test if puppeteer can initialize
    await pdfService.initializeBrowser();
    await pdfService.closeBrowser();

    res.json({
      success: true,
      message: 'PDF service is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PDF service health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'PDF service is not available',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;