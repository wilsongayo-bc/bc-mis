
import { AppDataSource } from '../config/database';
import { DocumentRequirement } from '../entities/DocumentRequirement';
import { DocumentCategory } from '../entities/DocumentCategory';
import { User } from '../entities/User';

async function addPreListingRequirements() {
  try {
    console.log('🔌 Connecting to database...');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('✅ Database connected');

    const requirementRepo = AppDataSource.getRepository(DocumentRequirement);
    const categoryRepo = AppDataSource.getRepository(DocumentCategory);
    const userRepo = AppDataSource.getRepository(User);

    // Get Admin User for createdBy
    const adminUser = await userRepo.findOne({ where: { email: 'admin@benedictcollege.com' } });
    
    // Get Categories
    const academicCategory = await categoryRepo.findOne({ where: { name: 'Academic Records' } });
    const administrativeCategory = await categoryRepo.findOne({ where: { name: 'Administrative Forms' } });

    if (!academicCategory || !administrativeCategory) {
      console.error('❌ Required categories not found. Please seed categories first.');
      return;
    }

    const newRequirements = [
      {
        name: 'Photocopy of Transcript of Records (TOR) or Informative Copy of Grades',
        description: 'Transcript of Records (TOR) or Informative Copy of Grades from previous school',
        isRequired: true,
        isInitial: true,
        categoryId: academicCategory.id,
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 5242880, // 5MB
          requiresVerification: true
        },
        applicableGradeLevels: ['College'],
        expirationDays: null
      },
      {
        name: 'Certificate of Transfer Credential / Honorable Dismissal',
        description: 'Certificate of Transfer Credential or Honorable Dismissal from previous school',
        isRequired: false, // Optional
        isInitial: true,
        categoryId: administrativeCategory.id,
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 5242880, // 5MB
          requiresVerification: true
        },
        applicableGradeLevels: ['College'],
        expirationDays: null
      },
      {
        name: 'Photocopy of First Semester Report Card (S.Y. 2025–2026)',
        description: 'First Semester Report Card for S.Y. 2025–2026',
        isRequired: true,
        isInitial: true,
        categoryId: academicCategory.id,
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 5242880, // 5MB
          requiresVerification: true
        },
        applicableGradeLevels: ['College'], // Incoming Freshmen
        expirationDays: null
      },
      {
        name: 'Certificate of Enrollment (CoE) for Second Semester (S.Y. 2025–2026)',
        description: 'Certificate of Enrollment (CoE) for the Second Semester of S.Y. 2025–2026',
        isRequired: true,
        isInitial: true,
        categoryId: administrativeCategory.id,
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 5242880, // 5MB
          requiresVerification: true
        },
        applicableGradeLevels: ['College'], // Incoming Freshmen
        expirationDays: null
      },
      {
        name: 'Photocopy of Complete Grade 12 Report Card (First & Second Semesters)',
        description: 'Complete Grade 12 (SHS) Report Card for both the First and Second Semesters',
        isRequired: true,
        isInitial: true,
        categoryId: academicCategory.id,
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 5242880, // 5MB
          requiresVerification: true
        },
        applicableGradeLevels: ['College'], // Incoming Freshmen (Old Grad)
        expirationDays: null
      },
      {
        name: 'Photocopy of Certificate of Rating (COR) - SHS Level A&E Test',
        description: 'Certificate of Rating (COR) for the Senior High School (SHS) level of the Accreditation and Equivalency (A&E) Test',
        isRequired: true,
        isInitial: true,
        categoryId: academicCategory.id,
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 5242880, // 5MB
          requiresVerification: true
        },
        applicableGradeLevels: ['College'], // Incoming Freshmen (ALS)
        expirationDays: null
      }
    ];

    console.log('📋 Checking and adding requirements...');

    for (const req of newRequirements) {
      const existing = await requirementRepo.findOne({ where: { name: req.name } });
      if (existing) {
        console.log(`🔹 Skipped: "${req.name}" (already exists)`);
      } else {
        const newReq = requirementRepo.create({
          ...req,
          createdBy: adminUser?.id
        });
        await requirementRepo.save(newReq);
        console.log(`✅ Added: "${req.name}"`);
      }
    }

    console.log('🎉 Done!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addPreListingRequirements();
