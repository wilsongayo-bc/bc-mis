
import { runMigrations, closeDatabase } from '../config/database';

async function main() {
  try {
    console.log('Running migrations...');
    await runMigrations();
    console.log('Migrations complete.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
