// Dweezil's Code - Issue #4: Fix document requirements by running migration
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { AppDataSource } from '../config/database';

async function fixDocumentRequirements() {
  try {
    console.log('🔧 Fixing document requirements...');
    console.log('📡 Connecting to database...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('✅ Database connected');

    // Check if document_requirements table exists
    const hasTable = await AppDataSource.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'document_requirements'
    `);

    if (hasTable[0].count === 0) {
      console.log('❌ document_requirements table does not exist');
      console.log('💡 Run migrations first: npm run migrate');
      process.exit(1);
    }

    console.log('✅ document_requirements table exists');

    // Dweezil's Code - Issue #4: First, ensure the category exists
    console.log('🔍 Checking if grade12 category exists...');
    const categoryExists = await AppDataSource.query(`
      SELECT id FROM document_categories WHERE id = 'grade12'
    `);

    if (categoryExists.length === 0) {
      console.log('❌ grade12 category not found, creating...');
      await AppDataSource.query(`
        INSERT INTO document_categories (id, name, description, is_active, created_at, updated_at)
        VALUES ('grade12', 'Grade 12 Documents', 'Documents required for Grade 12 graduates', 1, NOW(), NOW())
      `);
      console.log('✅ grade12 category created');
    } else {
      console.log('✅ grade12 category exists');
    }

    // Check if the specific requirement exists
    const existing = await AppDataSource.query(`
      SELECT id, name FROM document_requirements 
      WHERE id = 'a997fc62-17c8-43aa-b788-d2e0f1575117'
    `);

    if (existing.length > 0) {
      console.log('✅ Requirement already exists:', existing[0].name);
      console.log('🎉 No fix needed!');
    } else {
      console.log('❌ Requirement not found, inserting...');
      
      // Insert the requirement
      await AppDataSource.query(`
        INSERT INTO document_requirements (
          id, name, description, is_required, is_initial, 
          category_id, validation_rules, created_at, updated_at
        ) VALUES (
          'a997fc62-17c8-43aa-b788-d2e0f1575117',
          'Photocopy of Complete Grade 12 Report Card (First & Second Semesters)',
          'Complete Grade 12 (SHS) Report Card for both the First and Second Semesters',
          1,
          1,
          'grade12',
          '{"maxFileSize":10485760,"allowedFileTypes":["image/jpeg","image/png","application/pdf"]}',
          NOW(),
          NOW()
        )
      `);

      console.log('✅ Requirement inserted successfully!');
    }

    // Verify
    const result = await AppDataSource.query(`
      SELECT id, name, is_initial, category_id 
      FROM document_requirements 
      WHERE id = 'a997fc62-17c8-43aa-b788-d2e0f1575117'
    `);

    console.log('✅ Verification:', result[0]);
    console.log('🎉 Document requirements fixed!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Test file upload - create new student and upload file');
    console.log('2. Check logs - should see "Requirement found: YES"');
    console.log('3. Edit student - file should display');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

fixDocumentRequirements();
