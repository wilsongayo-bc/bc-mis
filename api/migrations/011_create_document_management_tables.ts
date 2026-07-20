import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentManagementTables1759828209000 implements MigrationInterface {
  name = 'CreateDocumentManagementTables1759828209000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tables already exist
    const categoriesExists = await queryRunner.hasTable('document_categories');
    const requirementsExists = await queryRunner.hasTable('document_requirements');
    const studentDocsExists = await queryRunner.hasTable('student_documents');
    
    // Create document_categories table
    if (!categoriesExists) {
      await queryRunner.query(`
        CREATE TABLE \`document_categories\` (
          \`id\` varchar(36) NOT NULL,
          \`name\` varchar(255) NOT NULL,
          \`description\` text NULL,
          \`color\` varchar(7) NOT NULL DEFAULT '#3B82F6',
          \`sort_order\` int NOT NULL DEFAULT 0,
          \`is_active\` tinyint NOT NULL DEFAULT 1,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE INDEX \`IDX_document_categories_name\` (\`name\`),
          INDEX \`IDX_document_categories_active\` (\`is_active\`),
          INDEX \`IDX_document_categories_sort\` (\`sort_order\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
      console.log('✅ Created document_categories table');
    } else {
      console.log('document_categories table already exists');
    }

    // Create document_requirements table
    if (!requirementsExists) {
      await queryRunner.query(`
        CREATE TABLE \`document_requirements\` (
          \`id\` varchar(36) NOT NULL,
          \`name\` varchar(255) NOT NULL,
          \`description\` text NULL,
          \`is_required\` tinyint NOT NULL DEFAULT 1,
          \`category_id\` varchar(36) NULL,
          \`validation_rules\` json NULL,
          \`applicable_grade_levels\` json NULL,
          \`expiration_days\` int NULL,
          \`created_by\` varchar(36) NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          INDEX \`IDX_document_requirements_category\` (\`category_id\`),
          INDEX \`IDX_document_requirements_required\` (\`is_required\`),
          INDEX \`IDX_document_requirements_created_at\` (\`created_at\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
      console.log('✅ Created document_requirements table');
    } else {
      console.log('document_requirements table already exists');
    }

    // Create student_documents table
    if (!studentDocsExists) {
      await queryRunner.query(`
        CREATE TABLE \`student_documents\` (
          \`id\` varchar(36) NOT NULL,
          \`student_id\` varchar(36) NOT NULL,
          \`requirement_id\` varchar(36) NOT NULL,
          \`file_name\` varchar(255) NOT NULL,
          \`file_path\` varchar(500) NOT NULL,
          \`file_type\` varchar(50) NULL,
          \`file_size\` int NULL,
          \`status\` enum('pending', 'approved', 'rejected', 'expired') NOT NULL DEFAULT 'pending',
          \`metadata\` json NULL,
          \`submitted_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`verified_at\` datetime(6) NULL,
          \`verified_by\` varchar(36) NULL,
          INDEX \`IDX_student_documents_student\` (\`student_id\`),
          INDEX \`IDX_student_documents_requirement\` (\`requirement_id\`),
          INDEX \`IDX_student_documents_status\` (\`status\`),
          INDEX \`IDX_student_documents_submitted\` (\`submitted_at\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
      console.log('✅ Created student_documents table');
    } else {
      console.log('student_documents table already exists');
    }

    // Add foreign key constraints only if tables were just created
    if (!requirementsExists && !categoriesExists) {
      await queryRunner.query(`
        ALTER TABLE \`document_requirements\` 
        ADD CONSTRAINT \`FK_document_requirements_category\` 
        FOREIGN KEY (\`category_id\`) REFERENCES \`document_categories\`(\`id\`) 
        ON DELETE SET NULL ON UPDATE NO ACTION
      `);

      await queryRunner.query(`
        ALTER TABLE \`document_requirements\` 
        ADD CONSTRAINT \`FK_document_requirements_created_by\` 
        FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) 
        ON DELETE SET NULL ON UPDATE NO ACTION
      `);
    }

    if (!studentDocsExists && !requirementsExists) {
      await queryRunner.query(`
        ALTER TABLE \`student_documents\` 
        ADD CONSTRAINT \`FK_student_documents_student\` 
        FOREIGN KEY (\`student_id\`) REFERENCES \`students\`(\`id\`) 
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);

      await queryRunner.query(`
        ALTER TABLE \`student_documents\` 
        ADD CONSTRAINT \`FK_student_documents_requirement\` 
        FOREIGN KEY (\`requirement_id\`) REFERENCES \`document_requirements\`(\`id\`) 
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);

      await queryRunner.query(`
        ALTER TABLE \`student_documents\` 
        ADD CONSTRAINT \`FK_student_documents_verified_by\` 
        FOREIGN KEY (\`verified_by\`) REFERENCES \`users\`(\`id\`) 
        ON DELETE SET NULL ON UPDATE NO ACTION
      `);
    }

    // Insert default document categories only if table is empty
    const categoryCount = await queryRunner.query(`SELECT COUNT(*) as count FROM \`document_categories\``);
    if (categoryCount[0].count === 0) {
      await queryRunner.query(`
        INSERT INTO \`document_categories\` (\`id\`, \`name\`, \`description\`, \`color\`, \`sort_order\`) VALUES
        (UUID(), 'Academic Records', 'Previous school records and transcripts', '#3B82F6', 1),
        (UUID(), 'Legal Documents', 'Birth certificates, ID copies, legal papers', '#10B981', 2),
        (UUID(), 'Medical Records', 'Health certificates, immunization records', '#F59E0B', 3),
        (UUID(), 'Personal Information', 'Photos, emergency contacts, address proof', '#8B5CF6', 4)
      `);
      console.log('✅ Seeded default document categories');
    } else {
      console.log('Document categories already exist, skipping seed');
    }

    // Insert default document requirements only if table is empty
    const requirementCount = await queryRunner.query(`SELECT COUNT(*) as count FROM \`document_requirements\``);
    if (requirementCount[0].count === 0) {
      await queryRunner.query(`
        INSERT INTO \`document_requirements\` (\`id\`, \`name\`, \`description\`, \`is_required\`, \`category_id\`, \`validation_rules\`, \`applicable_grade_levels\`) VALUES
        (UUID(), 'Birth Certificate', 'Official birth certificate issued by government authority', 1, 
         (SELECT id FROM \`document_categories\` WHERE name = 'Legal Documents' LIMIT 1),
         JSON_OBJECT('allowedFileTypes', JSON_ARRAY('pdf', 'jpg', 'png'), 'maxFileSize', 5242880),
         JSON_ARRAY('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
        (UUID(), 'Previous School Records/Transcript', 'Transcript or report card from previous school', 1,
         (SELECT id FROM \`document_categories\` WHERE name = 'Academic Records' LIMIT 1),
         JSON_OBJECT('allowedFileTypes', JSON_ARRAY('pdf'), 'maxFileSize', 10485760),
         JSON_ARRAY('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
        (UUID(), 'Medical Certificate/Health Records', 'Health certificate and medical records', 1,
         (SELECT id FROM \`document_categories\` WHERE name = 'Medical Records' LIMIT 1),
         JSON_OBJECT('allowedFileTypes', JSON_ARRAY('pdf', 'jpg', 'png'), 'maxFileSize', 5242880),
         JSON_ARRAY('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
        (UUID(), 'Parent/Guardian ID Copy', 'Copy of parent or guardian identification', 1,
         (SELECT id FROM \`document_categories\` WHERE name = 'Legal Documents' LIMIT 1),
         JSON_OBJECT('allowedFileTypes', JSON_ARRAY('pdf', 'jpg', 'png'), 'maxFileSize', 5242880),
         JSON_ARRAY('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
        (UUID(), 'Proof of Address', 'Utility bill or other proof of residence', 1,
         (SELECT id FROM \`document_categories\` WHERE name = 'Personal Information' LIMIT 1),
         JSON_OBJECT('allowedFileTypes', JSON_ARRAY('pdf', 'jpg', 'png'), 'maxFileSize', 5242880),
         JSON_ARRAY('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
        (UUID(), 'Passport-size Photos', '2x2 passport-size photographs', 1,
         (SELECT id FROM \`document_categories\` WHERE name = 'Personal Information' LIMIT 1),
         JSON_OBJECT('allowedFileTypes', JSON_ARRAY('jpg', 'png'), 'maxFileSize', 2097152),
         JSON_ARRAY('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
        (UUID(), 'Immunization Records', 'Vaccination records and immunization history', 0,
         (SELECT id FROM \`document_categories\` WHERE name = 'Medical Records' LIMIT 1),
         JSON_OBJECT('allowedFileTypes', JSON_ARRAY('pdf', 'jpg', 'png'), 'maxFileSize', 5242880),
         JSON_ARRAY('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
        (UUID(), 'Emergency Contact Information', 'Emergency contact details and authorization', 1,
         (SELECT id FROM \`document_categories\` WHERE name = 'Personal Information' LIMIT 1),
         JSON_OBJECT('allowedFileTypes', JSON_ARRAY('pdf', 'jpg', 'png'), 'maxFileSize', 5242880),
         JSON_ARRAY('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'))
      `);
      console.log('✅ Seeded default document requirements');
    } else {
      console.log('Document requirements already exist, skipping seed');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(`ALTER TABLE \`student_documents\` DROP FOREIGN KEY \`FK_student_documents_verified_by\``);
    await queryRunner.query(`ALTER TABLE \`student_documents\` DROP FOREIGN KEY \`FK_student_documents_requirement\``);
    await queryRunner.query(`ALTER TABLE \`student_documents\` DROP FOREIGN KEY \`FK_student_documents_student\``);
    await queryRunner.query(`ALTER TABLE \`document_requirements\` DROP FOREIGN KEY \`FK_document_requirements_created_by\``);
    await queryRunner.query(`ALTER TABLE \`document_requirements\` DROP FOREIGN KEY \`FK_document_requirements_category\``);

    // Drop tables
    await queryRunner.query(`DROP TABLE \`student_documents\``);
    await queryRunner.query(`DROP TABLE \`document_requirements\``);
    await queryRunner.query(`DROP TABLE \`document_categories\``);
  }
}