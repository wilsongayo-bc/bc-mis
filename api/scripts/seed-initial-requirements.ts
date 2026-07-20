// Dweezil's Code - Issue #4: Seed initial document requirements
import { AppDataSource } from '../config/database';

async function seedInitialRequirements() {
  try {
    console.log('🌱 Seeding initial document requirements...');

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connected');
    }

    const requirement = {
      id: 'a997fc62-17c8-43aa-b788-d2e0f1575117',
      name: 'Photocopy of Complete Grade 12 Report Card (First & Second Semesters)',
      description: 'Complete Grade 12 (SHS) Report Card for both the First and Second Semesters',
      is_required: true,
      is_initial: true,
      category_id: 'grade12',
      validation_rules: {
        maxFileSize: 10485760, // 10MB
        allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf']
      }
    };

    // Check if requirement already exists
    const existing = await AppDataSource.query(
      'SELECT id FROM document_requirements WHERE id = ?',
      [requirement.id]
    );

    if (existing.length > 0) {
      console.log('✅ Requirement already exists, updating...');
      await AppDataSource.query(
        `UPDATE document_requirements 
         SET name = ?, description = ?, is_required = ?, is_initial = ?, 
             category_id = ?, validation_rules = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          requirement.name,
          requirement.description,
          requirement.is_required,
          requirement.is_initial,
          requirement.category_id,
          JSON.stringify(requirement.validation_rules),
          requirement.id
        ]
      );
      console.log('✅ Requirement updated successfully');
    } else {
      console.log('✅ Creating new requirement...');
      await AppDataSource.query(
        `INSERT INTO document_requirements 
         (id, name, description, is_required, is_initial, category_id, validation_rules, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          requirement.id,
          requirement.name,
          requirement.description,
          requirement.is_required,
          requirement.is_initial,
          requirement.category_id,
          JSON.stringify(requirement.validation_rules)
        ]
      );
      console.log('✅ Requirement created successfully');
    }

    // Verify
    const result = await AppDataSource.query(
      'SELECT id, name, is_initial FROM document_requirements WHERE id = ?',
      [requirement.id]
    );

    console.log('✅ Verification:', result[0]);
    console.log('🎉 Initial requirements seeded successfully!');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding requirements:', error);
    process.exit(1);
  }
}

seedInitialRequirements();
