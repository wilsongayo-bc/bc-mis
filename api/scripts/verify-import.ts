import { AppDataSource } from '../config/database';
import { SubjectPrerequisite, PrerequisiteCategory } from '../entities/SubjectPrerequisite';

async function verify() {
  try {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(SubjectPrerequisite);
    
    const total = await repo.count();
    const required = await repo.count({ where: { category: PrerequisiteCategory.REQUIRED } });
    const coreq = await repo.count({ where: { category: PrerequisiteCategory.COREQUISITE } });
    
    console.log('\n--- VERIFICATION RESULTS ---');
    console.log(`Total Links: ${total}`);
    console.log(`Prerequisites (Required): ${required}`);
    console.log(`Co-requisites: ${coreq}`);

    if (coreq > 0) {
        const sample = await repo.findOne({ 
            where: { category: PrerequisiteCategory.COREQUISITE },
            relations: ['subject', 'prerequisiteSubject']
        });
        console.log(`\nSample Co-requisite: ${sample?.subject.code} has co-requisite ${sample?.prerequisiteSubject.code}`);
    } else {
        console.warn('\nWARNING: No co-requisites found! Check your JSON data.');
    }
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

verify();