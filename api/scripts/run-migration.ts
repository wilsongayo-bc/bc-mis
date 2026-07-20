import { AppDataSource } from '../config/database';
import { CreateAcademicYearsTable1760271600000 } from '../migrations/1760271600000-CreateAcademicYearsTable';

async function runMigration() {
  try {
    console.log('🚀 Starting migration execution...');
    
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connection established');
    
    // Create migration instance
    const migration = new CreateAcademicYearsTable1760271600000();
    
    // Run the migration
    console.log('🔄 Running CreateAcademicYearsTable migration...');
    await migration.up(AppDataSource.createQueryRunner());
    console.log('✅ Migration completed successfully');
    
    // Verify the table was created
    const tables = await AppDataSource.query("SHOW TABLES LIKE 'academic_years'");
    if (tables.length > 0) {
      console.log('✅ academic_years table created successfully');
      
      // Check if data was seeded
      const count = await AppDataSource.query('SELECT COUNT(*) as count FROM academic_years');
      console.log(`📊 Academic years seeded: ${count[0].count} records`);
    } else {
      console.log('❌ academic_years table was not created');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
runMigration();