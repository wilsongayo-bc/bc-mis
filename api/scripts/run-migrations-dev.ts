import { AppDataSource } from '../config/database';

async function runMigrations() {
  try {
    console.log('Initializing data source...');
    await AppDataSource.initialize();
    console.log('Running migrations...');
    const migrations = await AppDataSource.runMigrations();
    console.log(`Executed ${migrations.length} migrations:`);
    migrations.forEach(m => console.log(`- ${m.name}`));
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();
