import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dweezil's Code
 * Migration to add pre-listing document requirements with specific IDs
 * 
 * This migration adds the pre-listing requirements that are used during
 * the pre-registration process. These are separate from the main 5 requirements
 * and are used to categorize students into different groups (freshmen, grade12, als, transferee).
 * 
 * The IDs are hardcoded to match what the frontend expects in getPublicPreListingRequirements()
 */
export class AddPreListingRequirements1774000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('📋 Adding pre-listing document requirements...');
    console.log('');

    // Get the category ID for Initial Requirements
    let initialCategory = await queryRunner.query(
      `SELECT id FROM document_categories WHERE name = 'Initial Requirements' LIMIT 1`
    );

    let initialCategoryId = initialCategory[0]?.id;

    // If Initial Requirements category doesn't exist, create it
    if (!initialCategoryId) {
      console.log('📝 Creating Initial Requirements category...');
      await queryRunner.query(
        `INSERT INTO document_categories (id, name, description, created_at, updated_at) 
         VALUES (UUID(), 'Initial Requirements', 'Documents required during pre-registration', NOW(), NOW())`
      );
      
      initialCategory = await queryRunner.query(
        `SELECT id FROM document_categories WHERE name = 'Initial Requirements' LIMIT 1`
      );
      initialCategoryId = initialCategory[0]?.id;
      console.log(`✅ Created Initial Requirements category: ${initialCategoryId}`);
    } else {
      console.log(`✅ Found Initial Requirements category: ${initialCategoryId}`);
    }

    if (!initialCategoryId) {
      console.error('❌ Failed to create or find Initial Requirements category');
      return;
    }

    // Dweezil's Code - Pre-listing requirements with specific IDs that match frontend expectations
    const preListingRequirements = [
      {
        id: 'bc0b899c-0180-4835-9c13-1f638f2c1b8d',
        name: 'Photocopy of First Semester Report Card (S.Y. 2025–2026)',
        description: 'First Semester Report Card for S.Y. 2025–2026',
        isRequired: true,
        isInitial: true,
        categoryId: initialCategoryId,
        validationRules: JSON.stringify({
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 5242880,
          requiresVerification: false
        }),
        applicableGradeLevels: JSON.stringify(['First Year']),
        group: 'freshmen'
      },
      {
        id: 'bff481dd-7ddd-41ad-b4f3-c34033e72cb7',
        name: 'Certificate of Enrollment (CoE) for Second Semester (S.Y. 2025–2026)',
        description: 'Certificate of Enrollment (CoE) for the Second Semester of S.Y. 2025–2026',
        isRequired: true,
        isInitial: true,
        categoryId: initialCategoryId,
        validationRules: JSON.stringify({
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 5242880,
          requiresVerification: false
        }),
        applicableGradeLevels: JSON.stringify(['First Year']),
        group: 'freshmen'
      },
      {
        id: 'a997fc62-17c8-43aa-b788-d2e0f1575117',
        name: 'Photocopy of Complete Grade 12 Report Card (First & Second Semesters)',
        description: 'Complete Grade 12 (SHS) Report Card for both the First and Second Semesters',
        isRequired: true,
        isInitial: true,
        categoryId: initialCategoryId,
        validationRules: JSON.stringify({
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 5242880,
          requiresVerification: false
        }),
        applicableGradeLevels: JSON.stringify(['First Year']),
        group: 'grade12'
      },
      {
        id: '14b86acd-9cc7-4783-beed-08519f257db1',
        name: 'Photocopy of Certificate of Rating (COR) - SHS Level A&E Test',
        description: 'Certificate of Rating (COR) for the Senior High School (SHS) level of the Accreditation and Equivalency (A&E) Test',
        isRequired: true,
        isInitial: true,
        categoryId: initialCategoryId,
        validationRules: JSON.stringify({
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 5242880,
          requiresVerification: false
        }),
        applicableGradeLevels: JSON.stringify(['First Year']),
        group: 'als'
      },
      {
        id: '8e40983c-d926-41cc-b818-7a191e7ddd96',
        name: 'Photocopy of Transcript of Records (TOR) or Informative Copy of Grades',
        description: 'Transcript of Records (TOR) or Informative Copy of Grades from previous school',
        isRequired: true,
        isInitial: true,
        categoryId: initialCategoryId,
        validationRules: JSON.stringify({
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 5242880,
          requiresVerification: false
        }),
        applicableGradeLevels: JSON.stringify(['First Year', 'Second Year', 'Third Year', 'Fourth Year']),
        group: 'transferee'
      },
      {
        id: 'cb294b8f-3b4d-4c7e-9af9-40f7628f10c4',
        name: 'Certificate of Transfer Credential / Honorable Dismissal',
        description: 'Certificate of Transfer Credential or Honorable Dismissal from previous school',
        isRequired: false,
        isInitial: true,
        categoryId: initialCategoryId,
        validationRules: JSON.stringify({
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 5242880,
          requiresVerification: false
        }),
        applicableGradeLevels: JSON.stringify(['First Year', 'Second Year', 'Third Year', 'Fourth Year']),
        group: 'transferee'
      }
    ];

    console.log('📝 Creating pre-listing requirements with specific IDs...');
    let created = 0;
    
    for (const req of preListingRequirements) {
      // Check if requirement already exists
      const existing = await queryRunner.query(
        `SELECT id FROM document_requirements WHERE id = ?`,
        [req.id]
      );

      if (existing.length > 0) {
        console.log(`   ⏭️  Skipped (already exists): ${req.name}`);
        continue;
      }

      await queryRunner.query(
        `INSERT INTO document_requirements 
        (id, name, description, is_required, is_initial, category_id, validation_rules, applicable_grade_levels, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          req.id,
          req.name,
          req.description,
          req.isRequired,
          req.isInitial,
          req.categoryId,
          req.validationRules,
          req.applicableGradeLevels
        ]
      );
      console.log(`   ✅ Created: ${req.name} (${req.group})`);
      created++;
    }

    console.log(`✅ Successfully created ${created} pre-listing requirements`);
    console.log('');
    console.log('📊 Pre-Listing Requirements by Group:');
    console.log('   Freshmen (currently enrolled Grade 12):');
    console.log('     - First Semester Report Card (S.Y. 2025–2026)');
    console.log('     - Certificate of Enrollment for Second Semester');
    console.log('');
    console.log('   Grade 12 Graduates:');
    console.log('     - Complete Grade 12 Report Card (both semesters)');
    console.log('');
    console.log('   ALS Passers:');
    console.log('     - Certificate of Rating (COR) - SHS Level A&E Test');
    console.log('');
    console.log('   Transferees:');
    console.log('     - Transcript of Records (TOR) or Informative Copy');
    console.log('     - Transfer Credential / Honorable Dismissal (optional)');
    console.log('');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back pre-listing requirements...');
    
    // Delete the pre-listing requirements by their specific IDs
    const ids = [
      'bc0b899c-0180-4835-9c13-1f638f2c1b8d',
      'bff481dd-7ddd-41ad-b4f3-c34033e72cb7',
      'a997fc62-17c8-43aa-b788-d2e0f1575117',
      '14b86acd-9cc7-4783-beed-08519f257db1',
      '8e40983c-d926-41cc-b818-7a191e7ddd96',
      'cb294b8f-3b4d-4c7e-9af9-40f7628f10c4'
    ];

    for (const id of ids) {
      await queryRunner.query(
        `DELETE FROM document_requirements WHERE id = ?`,
        [id]
      );
    }
    
    console.log('✅ Pre-listing requirements rollback completed');
  }
}
