import { MigrationInterface, QueryRunner } from 'typeorm';

// Dweezil's Code
export class EnsureDocumentRequirementsExist1770900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if document_requirements table exists
    const tableExists = await queryRunner.hasTable('document_requirements');
    if (!tableExists) {
      console.log('⚠️ document_requirements table does not exist, skipping migration');
      return;
    }

    // Check if document_categories table exists
    const categoriesTableExists = await queryRunner.hasTable('document_categories');
    if (!categoriesTableExists) {
      console.log('⚠️ document_categories table does not exist, skipping migration');
      return;
    }

    const ensureCategory = async (params: {
      name: string;
      fallbackId: string;
      description: string;
      color: string;
      sortOrder: number;
    }): Promise<string> => {
      const existing = await queryRunner.query(`SELECT id FROM document_categories WHERE name = ? LIMIT 1`, [
        params.name
      ]);
      if (existing.length > 0 && existing[0]?.id) return existing[0].id as string;

      await queryRunner.query(
        `INSERT INTO document_categories (id, name, description, color, sort_order, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [params.fallbackId, params.name, params.description, params.color, params.sortOrder]
      );

      return params.fallbackId;
    };

    const academicCategoryId = await ensureCategory({
      name: 'Academic Records',
      fallbackId: 'f2e2a917-62ad-88ff-f2dd-a7a595020661',
      description: 'Previous school records and transcripts',
      color: '#3B82F6',
      sortOrder: 1
    });

    const enrollmentCategoryId = await ensureCategory({
      name: 'Enrollment Documents',
      fallbackId: '73e40586-1004-4b7b-8206-780f503e95d5',
      description: 'Enrollment forms and enrollment-related documents',
      color: '#10B981',
      sortOrder: 2
    });

    const financialCategoryId = await ensureCategory({
      name: 'Financial Documents',
      fallbackId: '65015dd5-c740-4c0d-bca2-e9eefa8a164b',
      description: 'Payment, billing, scholarship, and financial aid documents',
      color: '#F59E0B',
      sortOrder: 3
    });

    const personalCategoryId = await ensureCategory({
      name: 'Personal Documents',
      fallbackId: 'd91d1764-f409-434a-a2f4-c7d6db7a17f6',
      description: 'Personal identification and supporting documents',
      color: '#8B5CF6',
      sortOrder: 4
    });

    const policyCategoryId = await ensureCategory({
      name: 'Policies & Agreements',
      fallbackId: '8f7bd137-f73c-410c-a45b-752e34e9a766',
      description: 'Signed policies, agreements, and acknowledgements',
      color: '#6366F1',
      sortOrder: 5
    });

    // Ensure all required document requirements exist
    const requirements = [
      // Enrollment Documents
      {
        id: '73e40586-1004-4b7b-8206-780f503e95d6',
        name: 'Enrollment Application Form',
        description: 'Official enrollment application form',
        is_required: true,
        is_initial: false,
        category_id: enrollmentCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 2097152,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: null
      },
      {
        id: '83062808-b8fe-46d1-82ce-85783b6a15c7',
        name: 'Parent/Guardian Consent Form',
        description: 'Signed consent form from parent or legal guardian',
        is_required: true,
        is_initial: false,
        category_id: enrollmentCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 2097152,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 365
      },
      {
        id: '6a3e7eac-5662-4f3a-b3c3-277886dc49da',
        name: 'Student Registration Form',
        description: 'Completed student registration form with all required information',
        is_required: true,
        is_initial: false,
        category_id: enrollmentCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 3145728,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: null
      },
      // Financial Documents
      {
        id: '65015dd5-c740-4c0d-bca2-e9eefa8a164a',
        name: 'Financial Aid Application',
        description: 'Application form for financial aid or scholarship',
        is_required: false,
        is_initial: false,
        category_id: financialCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 3145728,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 365
      },
      {
        id: '2ea6c565-362b-4645-b117-4b7a384db81b',
        name: 'Payment Plan Agreement',
        description: 'Signed agreement for tuition payment plan',
        is_required: false,
        is_initial: false,
        category_id: financialCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 2097152,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 365
      },
      {
        id: 'db31df31-0856-4bd1-aafb-9ee0f67c9006',
        name: 'Scholarship Documentation',
        description: 'Supporting documents for scholarship application',
        is_required: false,
        is_initial: false,
        category_id: financialCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 5242880,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 365
      },
      {
        id: '0f0a22fa-e352-423b-8db6-0af221408a70',
        name: 'Tuition Payment Receipt',
        description: 'Official receipt of tuition payment',
        is_required: true,
        is_initial: false,
        category_id: financialCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 2097152,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: null
      },
      // Personal Documents
      {
        id: 'd91d1764-f409-434a-a2f4-c7d6db7a17f7',
        name: 'Birth Certificate',
        description: 'Original or certified true copy of birth certificate',
        is_required: true,
        is_initial: false,
        category_id: personalCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 3145728,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: null
      },
      {
        id: 'f5de3f97-7710-491a-8292-dd9708d39b57',
        name: 'Emergency Contact Information',
        description: 'Emergency contact details and authorization',
        is_required: true,
        is_initial: false,
        category_id: personalCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 1048576,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: false
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 365
      },
      {
        id: 'e2e6cd80-40f0-4381-b74a-2ae22e1f0c71',
        name: 'Government-issued ID',
        description: 'Valid government-issued identification card',
        is_required: true,
        is_initial: false,
        category_id: personalCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 2097152,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 1825
      },
      {
        id: '3b8fa70c-dda6-4407-91f5-b2a1757d1733',
        name: 'Medical Certificate',
        description: 'Recent medical certificate from licensed physician',
        is_required: true,
        is_initial: false,
        category_id: personalCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 2097152,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 180
      },
      {
        id: 'bce0f05d-952a-46ce-8b6e-5a739211f10a',
        name: 'Passport Photo (2x2)',
        description: 'Recent 2x2 passport-size photograph',
        is_required: true,
        is_initial: false,
        category_id: personalCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 1048576,
          allowedFileTypes: ['jpg', 'jpeg', 'png'],
          requiresVerification: false
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 365
      },
      // Policies & Agreements
      {
        id: 'a7c34159-8c93-4631-bbd6-825e159e6428',
        name: 'Code of Conduct Agreement',
        description: 'Signed acknowledgment of student code of conduct',
        is_required: true,
        is_initial: false,
        category_id: policyCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 1048576,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: false
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 365
      },
      {
        id: 'bed60059-597a-4599-a0e0-67bda90b1d94',
        name: 'Library Card Application',
        description: 'Application form for library access and borrowing privileges',
        is_required: false,
        is_initial: false,
        category_id: policyCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 1048576,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'gif'],
          requiresVerification: false
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 1095
      },
      {
        id: '766a4a3c-6a9e-4687-9002-facfcae213f3',
        name: 'Parking Permit Application',
        description: 'Application for campus parking permit and vehicle registration',
        is_required: false,
        is_initial: false,
        category_id: policyCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 1048576,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'gif'],
          requiresVerification: false
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 365
      },
      {
        id: '8ac93414-2222-4fba-9daa-2ae2a09b1513',
        name: 'Student Handbook Acknowledgment',
        description: 'Signed acknowledgment of receipt and understanding of student handbook',
        is_required: true,
        is_initial: false,
        category_id: policyCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 1048576,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: false
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 365
      },
      {
        id: '83665bb2-a642-44b5-bd4c-0a25f39cad20',
        name: 'Insurance Waiver',
        description: 'Waiver of liability and insurance coverage acknowledgment for campus activities',
        is_required: false,
        is_initial: false,
        category_id: policyCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 2097152,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'gif'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 365
      },
      {
        id: 'fd313606-511e-428c-857f-f83a5bc3b108',
        name: 'Photo/Video Release Form',
        description: 'Authorization for use of student photos and videos in institutional materials',
        is_required: false,
        is_initial: false,
        category_id: policyCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 1048576,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: false
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 1095
      },
      {
        id: '8f7bd137-f73c-410c-a45b-752e34e9a767',
        name: 'Privacy Policy Consent',
        description: 'Consent form for data privacy policy and personal information handling',
        is_required: true,
        is_initial: false,
        category_id: policyCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 1048576,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: false
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 1095
      },
      {
        id: '9e8d4536-4031-49b2-be23-b1ca0c8fa68b',
        name: 'Student Contract Agreement',
        description: 'Legal contract outlining terms and conditions of enrollment and education services',
        is_required: true,
        is_initial: false,
        category_id: policyCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 3145728,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'gif'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: null
      },
      // Academic Records
      {
        id: '8e720bce-27b7-4654-a584-01b30a253704',
        name: 'Academic Honors Certificate',
        description: 'Certificate of academic honors or awards from previous institution',
        is_required: false,
        is_initial: false,
        category_id: academicCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 2097152,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: null
      },
      {
        id: '67a21b99-5649-48f8-9a0c-ea7a3bb5f50f',
        name: 'Diploma/Certificate Copy',
        description: 'Photocopy of diploma or certificate from previous educational level',
        is_required: false,
        is_initial: false,
        category_id: academicCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 3145728,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: null
      },
      {
        id: 'f3da0187-22ef-4dcf-b840-6bd241125854',
        name: 'Official Transcript',
        description: 'Official transcript of records from previous school',
        is_required: false,
        is_initial: false,
        category_id: academicCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 5242880,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: null
      },
      {
        id: '37d449c2-0336-4cfc-b49b-f2e5c1f0fc38',
        name: 'Transfer Credits Documentation',
        description: 'Documentation of transfer credits from previous institution',
        is_required: false,
        is_initial: false,
        category_id: academicCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 3145728,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
          requiresVerification: true
        }),
        applicable_grade_levels: JSON.stringify(['College']),
        expiration_days: null
      },
      {
        id: '9903cb9f-15e1-42aa-baba-9fbe98f91d52',
        name: 'Course Selection Form',
        description: 'Completed form indicating selected courses for the semester',
        is_required: false,
        is_initial: false,
        category_id: academicCategoryId,
        validation_rules: JSON.stringify({
          maxFileSize: 2097152,
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          requiresVerification: false
        }),
        applicable_grade_levels: JSON.stringify(['Grade 11', 'Grade 12', 'College']),
        expiration_days: 180
      }
    ];

    // Insert requirements if they don't exist
    for (const req of requirements) {
      const exists = await queryRunner.query(
        `SELECT id FROM document_requirements WHERE id = ?`,
        [req.id]
      );

      if (exists.length === 0) {
        await queryRunner.query(
          `INSERT INTO document_requirements 
          (id, name, description, is_required, is_initial, category_id, validation_rules, applicable_grade_levels, expiration_days, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            req.id,
            req.name,
            req.description,
            req.is_required,
            req.is_initial,
            req.category_id,
            req.validation_rules,
            req.applicable_grade_levels,
            req.expiration_days
          ]
        );
        console.log(`✅ Created document requirement: ${req.name}`);
      } else {
        console.log(`ℹ️ Document requirement already exists: ${req.name}`);
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // This migration only adds missing requirements, so down migration is not needed
    console.log('⚠️ Down migration not implemented - requirements will not be removed');
  }
}
