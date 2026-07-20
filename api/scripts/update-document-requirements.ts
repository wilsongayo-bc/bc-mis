/**
 * Dweezil's Code
 * Script to update document requirements to match new specifications
 * Run with: npx ts-node scripts/update-document-requirements.ts
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { DocumentRequirement } from '../entities/DocumentRequirement';
import { DocumentCategory } from '../entities/DocumentCategory';

const DEFAULT_DOCUMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;

async function updateDocumentRequirements() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const requirementRepo = AppDataSource.getRepository(DocumentRequirement);
    const categoryRepo = AppDataSource.getRepository(DocumentCategory);

    // Get categories
    console.log('📋 Fetching document categories...');
    const academicRecordsCategory = await categoryRepo.findOne({
      where: { name: 'Academic Records' }
    });
    const personalDocsCategory = await categoryRepo.findOne({
      where: { name: 'Personal Documents' }
    });

    if (!academicRecordsCategory || !personalDocsCategory) {
      console.error('❌ Required categories not found. Please ensure document categories are seeded first.');
      process.exit(1);
    }

    console.log('✅ Categories found');
    console.log(`   - Academic Records: ${academicRecordsCategory.id}`);
    console.log(`   - Personal Documents: ${personalDocsCategory.id}\n`);

    // Delete old requirements
    console.log('🗑️  Deleting old document requirements...');
    await requirementRepo.delete({});
    console.log('✅ Old requirements deleted\n');

    // Define new requirements
    const newRequirements = [
      {
        name: 'Original form 9/Report Card',
        description: 'Original Form 9 or Report Card from previous school',
        isRequired: true,
        categoryId: academicRecordsCategory.id,
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
          requiresVerification: true
        },
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year']
      },
      {
        name: 'Original Good Moral Certificate',
        description: 'Original Good Moral Certificate from previous school',
        isRequired: true,
        categoryId: academicRecordsCategory.id,
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
          requiresVerification: true
        },
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year']
      },
      {
        name: 'Certificate of graduation/Diploma (photocopy)',
        description: 'Photocopy of Certificate of Graduation or Diploma',
        isRequired: true,
        categoryId: academicRecordsCategory.id,
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
          requiresVerification: true
        },
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year']
      },
      {
        name: 'Original PSA Certificate',
        description: 'Original PSA Birth Certificate',
        isRequired: true,
        categoryId: personalDocsCategory.id,
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
          requiresVerification: true
        },
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year']
      },
      {
        name: '3 copies of 2x2/passport picture (recent)',
        description: '3 copies of recent 2x2 or passport-sized pictures',
        isRequired: true,
        categoryId: personalDocsCategory.id,
        validationRules: {
          allowedFileTypes: ['jpg', 'jpeg', 'png'],
          maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
          requiresVerification: true
        },
        applicableGradeLevels: ['First Year', 'Second Year', 'Third Year', 'Fourth Year']
      }
    ];

    // Insert new requirements
    console.log('📝 Creating new document requirements...');
    let created = 0;
    for (const reqData of newRequirements) {
      const requirement = requirementRepo.create(reqData);
      await requirementRepo.save(requirement);
      console.log(`   ✅ Created: ${reqData.name}`);
      created++;
    }

    console.log(`\n✅ Successfully created ${created} document requirements\n`);

    // Verify
    console.log('🔍 Verifying new requirements...');
    const allRequirements = await requirementRepo.find({
      relations: ['category']
    });

    console.log(`\n📊 Total requirements in database: ${allRequirements.length}\n`);
    console.log('Requirements:');
    allRequirements.forEach((req, index) => {
      console.log(`${index + 1}. ${req.name}`);
      console.log(`   Category: ${req.category?.name || 'None'}`);
      console.log(`   Required: ${req.isRequired ? 'Yes' : 'No'}`);
      console.log(`   File Types: ${req.validationRules?.allowedFileTypes?.join(', ') || 'Any'}`);
      console.log(`   Max Size: ${req.validationRules?.maxFileSize ? `${(req.validationRules.maxFileSize / 1024 / 1024).toFixed(2)} MB` : 'No limit'}`);
      console.log('');
    });

    console.log('✅ Document requirements update completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating document requirements:', error);
    process.exit(1);
  }
}

// Run the update
updateDocumentRequirements();
