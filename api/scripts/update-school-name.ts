import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Settings } from '../entities/Settings';

async function updateSchoolName() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const settingsRepo = AppDataSource.getRepository(Settings);
    
    // Find the school_name setting
    const schoolNameSetting = await settingsRepo.findOne({ 
      where: { key: 'school_name' } 
    });

    if (!schoolNameSetting) {
      console.log('❌ School name setting not found');
      return;
    }

    console.log(`📝 Current school name: "${schoolNameSetting.value}"`);
    
    // Update the value
    schoolNameSetting.value = 'Colegio de Alicia';
    await settingsRepo.save(schoolNameSetting);
    
    console.log(`✅ School name updated to: "${schoolNameSetting.value}"`);
    
  } catch (error) {
    console.error('❌ Error updating school name:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the script if called directly
if (require.main === module) {
  console.log('🚀 Starting school name update script...');
  updateSchoolName().catch(console.error);
}

export { updateSchoolName };