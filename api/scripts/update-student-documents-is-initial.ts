import { AppDataSource } from '../config/database';
import { StudentDocument } from '../entities/StudentDocument';
import { DocumentRequirement } from '../entities/DocumentRequirement';

async function updateStudentDocumentsIsInitial() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const studentDocumentRepository = AppDataSource.getRepository(StudentDocument);
    const _documentRequirementRepository = AppDataSource.getRepository(DocumentRequirement);

    console.log('📋 Fetching all student documents...');
    const documents = await studentDocumentRepository.find({
      relations: ['requirement']
    });

    console.log(`📊 Found ${documents.length} student documents`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const doc of documents) {
      if (!doc.requirement) {
        console.log(`⚠️  Document ${doc.id} has no requirement, skipping...`);
        skippedCount++;
        continue;
      }

      // Update isInitial based on requirement's isInitial
      if (doc.isInitial !== doc.requirement.isInitial) {
        doc.isInitial = doc.requirement.isInitial;
        await studentDocumentRepository.save(doc);
        updatedCount++;
        console.log(`✅ Updated document ${doc.id} - isInitial: ${doc.isInitial}`);
      } else {
        skippedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total documents: ${documents.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log('✅ Update complete!');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error updating student documents:', error);
    process.exit(1);
  }
}

updateStudentDocumentsIsInitial();
