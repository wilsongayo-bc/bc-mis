import { AppDataSource } from '../config/database';
import { StudentDocument } from '../entities/StudentDocument';

async function checkStudentDocuments() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const repo = AppDataSource.getRepository(StudentDocument);
    
    // Get documents for the specific student
    const studentId = '45d1f1fb-dfcf-43dc-a845-8896c666107a';
    
    const documents = await repo.find({
      where: { studentId },
      relations: ['requirement'],
      order: { submittedAt: 'DESC' }
    });

    console.log(`\n📋 Documents for student ${studentId}:`);
    console.log(`   Total: ${documents.length}`);
    
    const initialDocs = documents.filter(d => d.isInitial);
    const nonInitialDocs = documents.filter(d => !d.isInitial);
    
    console.log(`\n✅ Initial Documents (isInitial = true): ${initialDocs.length}`);
    initialDocs.forEach(doc => {
      console.log(`   - ${doc.requirement?.name || 'Unknown'}`);
      console.log(`     Requirement isInitial: ${doc.requirement?.isInitial}`);
      console.log(`     Document isInitial: ${doc.isInitial}`);
    });
    
    console.log(`\n📄 Non-Initial Documents (isInitial = false): ${nonInitialDocs.length}`);
    nonInitialDocs.forEach(doc => {
      console.log(`   - ${doc.requirement?.name || 'Unknown'}`);
      console.log(`     Requirement isInitial: ${doc.requirement?.isInitial}`);
      console.log(`     Document isInitial: ${doc.isInitial}`);
    });

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStudentDocuments();
