import { AppDataSource } from '../config/database';
import { DocumentRequirement } from '../entities/DocumentRequirement';

async function checkInitialRequirements() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const repo = AppDataSource.getRepository(DocumentRequirement);
    
    const initialReqs = await repo.find({
      where: { isInitial: true }
    });
    
    const nonInitialReqs = await repo.find({
      where: { isInitial: false }
    });

    console.log('\n📋 Initial Requirements (isInitial = true):');
    console.log(`   Count: ${initialReqs.length}`);
    initialReqs.forEach(req => {
      console.log(`   - ${req.name} (ID: ${req.id})`);
    });

    console.log('\n📋 Non-Initial Requirements (isInitial = false):');
    console.log(`   Count: ${nonInitialReqs.length}`);
    nonInitialReqs.forEach(req => {
      console.log(`   - ${req.name} (ID: ${req.id})`);
    });

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkInitialRequirements();
