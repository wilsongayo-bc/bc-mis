import { AppDataSource } from '../config/database';
import { DocumentRequirement } from '../entities/DocumentRequirement';
import { DocumentCategory } from '../entities/DocumentCategory';

/**
 * Seed script to add missing document requirements
 * Run with: npm run seed-missing-requirements
 */

async function seedMissingRequirements() {
  try {
    console.log('🌱 Starting to seed missing document requirements...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection initialized');
    }

    const requirementRepo = AppDataSource.getRepository(DocumentRequirement);
    const categoryRepo = AppDataSource.getRepository(DocumentCategory);

    // Get or create "Full Registration" category
    let fullRegCategory = await categoryRepo.findOne({
      where: { name: 'Full Registration Documents' }
    });

    if (!fullRegCategory) {
      fullRegCategory = categoryRepo.create({
        name: 'Full Registration Documents',
        description: 'Documents required for full student registration',
        color: '#3B82F6',
        sortOrder: 2,
        isActive: true
      });
      await categoryRepo.save(fullRegCategory);
      console.log('✅ Created Full Registration category');
    }

    // Define missing requirements
    const missingRequirements = [
      {
        name: 'Official Transcript',
        description: 'Official academic transcript from previous institution',
        isRequired: true,
        categoryId: fullRegCategory.id,
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        validationRules: {
          maxFileSize: 10485760, // 10MB
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: true
        }
      },
      {
        name: 'Course Selection Form',
        description: 'Completed course selection form for the semester',
        isRequired: true,
        categoryId: fullRegCategory.id,
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        validationRules: {
          maxFileSize: 5242880, // 5MB
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: false
        }
      },
      {
        name: 'Transfer Credits Documentation',
        description: 'Documentation of transfer credits from previous institution',
        isRequired: false,
        categoryId: fullRegCategory.id,
        applicableGradeLevels: ['First Year', 'Second Year'],
        validationRules: {
          maxFileSize: 10485760, // 10MB
          allowedFileTypes: ['pdf'],
          requiresVerification: true
        }
      },
      {
        name: 'Enrollment Application Form',
        description: 'Completed enrollment application form',
        isRequired: true,
        categoryId: fullRegCategory.id,
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        validationRules: {
          maxFileSize: 5242880, // 5MB
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: false
        }
      },
      {
        name: 'Student Registration Form',
        description: 'Official student registration form',
        isRequired: true,
        categoryId: fullRegCategory.id,
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        validationRules: {
          maxFileSize: 5242880, // 5MB
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: false
        }
      },
      {
        name: 'Financial Aid Application',
        description: 'Financial aid application form (if applicable)',
        isRequired: false,
        categoryId: fullRegCategory.id,
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        validationRules: {
          maxFileSize: 5242880, // 5MB
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: true
        }
      },
      {
        name: 'Payment Plan Agreement',
        description: 'Signed payment plan agreement',
        isRequired: false,
        categoryId: fullRegCategory.id,
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        validationRules: {
          maxFileSize: 5242880, // 5MB
          allowedFileTypes: ['pdf'],
          requiresVerification: false
        }
      },
      {
        name: 'Emergency Contact Information',
        description: 'Emergency contact information form',
        isRequired: true,
        categoryId: fullRegCategory.id,
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        validationRules: {
          maxFileSize: 2097152, // 2MB
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: false
        }
      },
      {
        name: 'Library Card Application',
        description: 'Library card application form',
        isRequired: false,
        categoryId: fullRegCategory.id,
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        validationRules: {
          maxFileSize: 2097152, // 2MB
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: false
        }
      },
      {
        name: 'Parking Permit Application',
        description: 'Parking permit application (if needed)',
        isRequired: false,
        categoryId: fullRegCategory.id,
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        validationRules: {
          maxFileSize: 2097152, // 2MB
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: false
        }
      },
      {
        name: 'Insurance Waiver',
        description: 'Health insurance waiver form (if applicable)',
        isRequired: false,
        categoryId: fullRegCategory.id,
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        validationRules: {
          maxFileSize: 5242880, // 5MB
          allowedFileTypes: ['pdf'],
          requiresVerification: true
        }
      },
      {
        name: 'Student Contract Agreement',
        description: 'Signed student contract agreement',
        isRequired: true,
        categoryId: fullRegCategory.id,
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
        validationRules: {
          maxFileSize: 5242880, // 5MB
          allowedFileTypes: ['pdf'],
          requiresVerification: false
        }
      }
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const reqData of missingRequirements) {
      // Check if requirement already exists
      const existing = await requirementRepo.findOne({
        where: { name: reqData.name }
      });

      if (existing) {
        console.log(`⏭️  Skipped: ${reqData.name} (already exists)`);
        skippedCount++;
        continue;
      }

      // Create new requirement
      const requirement = requirementRepo.create(reqData);
      await requirementRepo.save(requirement);
      console.log(`✅ Added: ${reqData.name}`);
      addedCount++;
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Added: ${addedCount} requirements`);
    console.log(`   ⏭️  Skipped: ${skippedCount} requirements (already existed)`);
    console.log('\n🎉 Seeding completed successfully!');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding requirements:', error);
    process.exit(1);
  }
}

// Run the seed function
seedMissingRequirements();
