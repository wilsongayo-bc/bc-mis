import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dweezil's Code
 * Migration to update document requirements to match new specifications
 * Changes all required documents to:
 * 1. Original form 9/Report Card
 * 2. Original Good Moral Certificate
 * 3. Certificate of graduation/Diploma (photocopy)
 * 4. Original PSA Certificate
 * 5. 3 copies of 2x2/passport picture (recent)
 * 
 * IMPORTANT: This migration will:
 * - Delete existing student documents that reference old requirements
 * - Delete old document requirements
 * - Create 5 new document requirements
 * - Clear old requirement IDs from all student records
 * 
 * Students will need to re-upload their documents with the new requirements.
 */
export class UpdateDocumentRequirements1774000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('📋 Starting document requirements update...');
    console.log('⚠️  WARNING: This migration will:');
    console.log('   - Delete existing student documents');
    console.log('   - Delete old document requirements');
    console.log('   - Create 5 new requirements');
    console.log('   - Clear old requirement IDs from student records');
    console.log('⚠️  Students will need to re-upload documents with new requirements');
    console.log('');

    // Get the category IDs for Academic Records and Personal Documents
    const academicRecordsCategory = await queryRunner.query(
      `SELECT id FROM document_categories WHERE name = 'Academic Records' LIMIT 1`
    );
    const personalDocsCategory = await queryRunner.query(
      `SELECT id FROM document_categories WHERE name = 'Personal Documents' LIMIT 1`
    );

    const academicCategoryId = academicRecordsCategory[0]?.id;
    const personalCategoryId = personalDocsCategory[0]?.id;

    if (!academicCategoryId || !personalCategoryId) {
      console.warn('⚠️ Document categories not found. Skipping document requirements update.');
      console.warn('   Please ensure document categories are seeded first.');
      return;
    }

    console.log('✅ Found categories:');
    console.log(`   - Academic Records: ${academicCategoryId}`);
    console.log(`   - Personal Documents: ${personalCategoryId}`);

    // Dweezil's Code - First, delete student documents that reference requirements
    console.log('🗑️  Removing student document references...');
    await queryRunner.query(`DELETE FROM student_documents WHERE requirement_id IS NOT NULL`);
    console.log('✅ Student document references removed');

    // Delete old document requirements
    console.log('🗑️  Deleting old document requirements...');
    await queryRunner.query(`DELETE FROM document_requirements`);
    console.log('✅ Old requirements deleted');

    // Insert new document requirements
    console.log('📝 Creating new document requirements...');
    
    const requirements = [
      {
        name: 'Original form 9/Report Card',
        description: 'Original Form 9 or Report Card from previous school',
        isRequired: true,
        categoryId: academicCategoryId,
        validationRules: JSON.stringify({
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 5242880,
          requiresVerification: true
        }),
        applicableGradeLevels: JSON.stringify(['First Year', 'Second Year', 'Third Year', 'Fourth Year'])
      },
      {
        name: 'Original Good Moral Certificate',
        description: 'Original Good Moral Certificate from previous school',
        isRequired: true,
        categoryId: academicCategoryId,
        validationRules: JSON.stringify({
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 3145728,
          requiresVerification: true
        }),
        applicableGradeLevels: JSON.stringify(['First Year', 'Second Year', 'Third Year', 'Fourth Year'])
      },
      {
        name: 'Certificate of graduation/Diploma (photocopy)',
        description: 'Photocopy of Certificate of Graduation or Diploma',
        isRequired: true,
        categoryId: academicCategoryId,
        validationRules: JSON.stringify({
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 3145728,
          requiresVerification: true
        }),
        applicableGradeLevels: JSON.stringify(['First Year', 'Second Year', 'Third Year', 'Fourth Year'])
      },
      {
        name: 'Original PSA Certificate',
        description: 'Original PSA Birth Certificate',
        isRequired: true,
        categoryId: personalCategoryId,
        validationRules: JSON.stringify({
          allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
          maxFileSize: 3145728,
          requiresVerification: true
        }),
        applicableGradeLevels: JSON.stringify(['First Year', 'Second Year', 'Third Year', 'Fourth Year'])
      },
      {
        name: '3 copies of 2x2/passport picture (recent)',
        description: '3 copies of recent 2x2 or passport-sized pictures',
        isRequired: true,
        categoryId: personalCategoryId,
        validationRules: JSON.stringify({
          allowedFileTypes: ['jpg', 'jpeg', 'png'],
          maxFileSize: 2097152,
          requiresVerification: true
        }),
        applicableGradeLevels: JSON.stringify(['First Year', 'Second Year', 'Third Year', 'Fourth Year'])
      }
    ];

    let created = 0;
    for (const req of requirements) {
      await queryRunner.query(
        `INSERT INTO document_requirements 
        (id, name, description, is_required, category_id, validation_rules, applicable_grade_levels, created_at, updated_at) 
        VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          req.name,
          req.description,
          req.isRequired,
          req.categoryId,
          req.validationRules,
          req.applicableGradeLevels
        ]
      );
      console.log(`   ✅ Created: ${req.name}`);
      created++;
    }

    console.log(`✅ Successfully created ${created} document requirements`);
    console.log('');
    console.log('📊 New Requirements:');
    console.log('   1. Original form 9/Report Card (5MB max)');
    console.log('   2. Original Good Moral Certificate (3MB max)');
    console.log('   3. Certificate of graduation/Diploma (photocopy) (3MB max)');
    console.log('   4. Original PSA Certificate (3MB max)');
    console.log('   5. 3 copies of 2x2/passport picture (recent) (2MB max)');
    console.log('');

    // Dweezil's Code - Fix existing students to clear old requirement IDs
    console.log('🔄 Updating existing students to clear old requirement IDs...');
    const studentsTable = await queryRunner.getTable('students');
    const documentsRequiredColumn =
      studentsTable?.findColumnByName('documentsRequired')?.name ||
      studentsTable?.findColumnByName('documents_required')?.name ||
      null;
    const documentsSubmittedColumn =
      studentsTable?.findColumnByName('documentsSubmitted')?.name ||
      studentsTable?.findColumnByName('documents_submitted')?.name ||
      null;

    if (documentsRequiredColumn && documentsSubmittedColumn) {
      await queryRunner.query(
        `
        UPDATE students
        SET \`${documentsRequiredColumn}\` = ?,
            \`${documentsSubmittedColumn}\` = ?
        WHERE \`${documentsRequiredColumn}\` IS NOT NULL
           OR \`${documentsSubmittedColumn}\` IS NOT NULL
        `,
        ['[]', '[]']
      );
    } else {
      console.warn('⚠️ students documents columns not found. Skipping student documents reset.');
    }
    console.log('✅ Student records updated - old requirement IDs cleared');
    console.log('📝 Note: Students will need to re-upload documents with new requirements');
    console.log('');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back document requirements update...');
    
    // Rollback: Delete the new requirements
    await queryRunner.query(`DELETE FROM document_requirements`);
    
    console.log('✅ Document requirements rollback completed');
    console.log('⚠️  Note: Old requirements were not restored. Run seeder to restore default requirements.');
  }
}
