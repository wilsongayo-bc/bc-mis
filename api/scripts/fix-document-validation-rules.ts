import { AppDataSource } from '../config/database';
import { DocumentRequirement } from '../entities/DocumentRequirement';

/**
 * Dweezil's Code
 * Fix validation rules for document requirements to allow image uploads
 * 
 * Issue: 12 documents failing with "File type not allowed" error
 * Root cause: validation_rules only allow 'pdf' but users are uploading 'image/jpeg'
 * Solution: Update validation rules to allow common image formats (jpg, jpeg, png, pdf)
 */

const FAILING_DOCUMENT_NAMES = [
  'Official Transcript',
  'Transfer Credits Documentation',
  'Course Selection Form',
  'Enrollment Application Form',
  'Student Registration Form',
  'Financial Aid Application',
  'Payment Plan Agreement',
  'Emergency Contact Information',
  'Library Card Application',
  'Parking Permit Application',
  'Insurance Waiver',
  'Student Contract Agreement'
];

const DEFAULT_DOCUMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;

async function fixDocumentValidationRules() {
  try {
    console.log('🔧 Starting document validation rules fix...\n');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connected\n');
    }

    const documentRequirementRepository = AppDataSource.getRepository(DocumentRequirement);

    // Fetch all document requirements
    const allRequirements = await documentRequirementRepository.find();
    console.log(`📋 Total document requirements: ${allRequirements.length}\n`);

    // Find the failing requirements
    const failingRequirements = allRequirements.filter(req => 
      FAILING_DOCUMENT_NAMES.includes(req.name)
    );

    console.log(`🔍 Found ${failingRequirements.length} requirements to fix:\n`);

    for (const requirement of failingRequirements) {
      console.log(`\n📄 ${requirement.name}`);
      console.log(`   ID: ${requirement.id}`);
      console.log(`   Current validation rules:`, requirement.validationRules);

      // Update validation rules to allow common file types
      const updatedRules = {
        ...requirement.validationRules,
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'gif'],
        maxFileSize: requirement.validationRules?.maxFileSize || DEFAULT_DOCUMENT_MAX_FILE_SIZE // 10MB default
      };

      requirement.validationRules = updatedRules;
      await documentRequirementRepository.save(requirement);

      console.log(`   ✅ Updated validation rules:`, updatedRules);
    }

    console.log('\n\n✅ All document validation rules have been updated!');
    console.log('\n📊 Summary:');
    console.log(`   - Total requirements checked: ${allRequirements.length}`);
    console.log(`   - Requirements updated: ${failingRequirements.length}`);
    console.log(`   - New allowed file types: pdf, jpg, jpeg, png, gif`);

    // Show any requirements that weren't found
    const foundNames = failingRequirements.map(r => r.name);
    const notFound = FAILING_DOCUMENT_NAMES.filter(name => !foundNames.includes(name));
    
    if (notFound.length > 0) {
      console.log('\n⚠️  Requirements not found in database:');
      notFound.forEach(name => console.log(`   - ${name}`));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing document validation rules:', error);
    process.exit(1);
  }
}

// Run the fix
fixDocumentValidationRules();
