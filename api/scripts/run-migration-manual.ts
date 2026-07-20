import { AppDataSource } from '../config/database';

async function run() {
    try {
        console.log('Initializing DataSource...');
        await AppDataSource.initialize();
        console.log('DataSource initialized.');

        console.log('Running migrations...');
        const migrations = await AppDataSource.runMigrations();
        console.log(`Executed ${migrations.length} migrations:`);
        migrations.forEach(m => console.log(`- ${m.name}`));

        await AppDataSource.destroy();
        console.log('Done.');
    } catch (error) {
        console.error('Error running migrations:', error);
        process.exit(1);
    }
}

run();
