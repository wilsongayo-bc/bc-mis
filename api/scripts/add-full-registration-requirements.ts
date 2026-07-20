import { AppDataSource } from '../config/database';
import { DocumentRequirement } from '../entities/DocumentRequirement';
import { DocumentCategory } from '../entities/DocumentCategory';

async function addFullRegistrationRequirements() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const requirementRepo = AppDataSource.getRepository(DocumentRequirement);
    const categoryRepo = AppDataSource.getRepository(DocumentCategory);

    const academicCategory = await categoryRepo.findOne({ where: { name: 'Academic Records' } });
    const administrativeCategory = await categoryRepo.findOne({ where: { name: 'Administrative Forms' } });

    const generalReqs: Array<Partial<DocumentRequirement>> = [
      {
        name: 'Photocopy of PSA Birth Certificate',
        description: 'Provide a photocopy of PSA-issued birth certificate',
        isRequired: true,
        categoryId: administrativeCategory?.id,
      },
      {
        name: 'ID Copy (Student or Guardian)',
        description: 'Valid government-issued ID',
        isRequired: true,
        categoryId: administrativeCategory?.id,
      },
      {
        name: 'Medical Records/Health Certificate',
        description: 'Medical certificate of fitness',
        isRequired: true,
        categoryId: administrativeCategory?.id,
      },
      {
        name: 'Previous School Records/Transcript',
        description: 'Academic records from previous institution',
        isRequired: true,
        categoryId: academicCategory?.id,
      },
      {
        name: 'Passport-sized Photos',
        description: 'Recent passport-size photographs',
        isRequired: true,
        categoryId: administrativeCategory?.id,
      },
      {
        name: 'Proof of Address',
        description: 'Document showing current address',
        isRequired: true,
        categoryId: administrativeCategory?.id,
      },
      {
        name: 'Immunization Records',
        description: 'Vaccination record (optional)',
        isRequired: false,
        categoryId: administrativeCategory?.id,
      }
    ];

    for (const req of generalReqs) {
      const existing = await requirementRepo.findOne({ where: { name: req.name as string } });
      if (existing) {
        let changed = false;
        if (existing.applicableGradeLevels !== null) {
          existing.applicableGradeLevels = null;
          changed = true;
        }
        if (!existing.validationRules) {
          existing.validationRules = {
            allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
            maxFileSize: 10 * 1024 * 1024,
            requiresVerification: true,
          };
          changed = true;
        }
        if (!existing.categoryId && req.categoryId) {
          existing.categoryId = req.categoryId;
          changed = true;
        }
        if (changed) {
          const updated = await requirementRepo.save(existing);
          console.log(`🔁 Updated requirement: ${updated.name} (${updated.id})`);
        } else {
          console.log(`✔ Requirement up-to-date: ${req.name}`);
        }
        continue;
      }
      const newReq = requirementRepo.create({
        name: req.name as string,
        description: req.description,
        isRequired: req.isRequired ?? true,
        categoryId: req.categoryId,
        validationRules: {
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 10 * 1024 * 1024,
          requiresVerification: true,
        },
        applicableGradeLevels: null,
      });
      const saved = await requirementRepo.save(newReq);
      console.log(`➕ Created requirement: ${saved.name} (${saved.id})`);
    }

    console.log('✅ Full registration requirements seeding completed');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Failed to seed full registration requirements:', error);
    process.exitCode = 1;
  }
}

addFullRegistrationRequirements();
