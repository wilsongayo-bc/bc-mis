
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

interface MySQLError {
  code: string;
  message: string;
}

async function fixSchema() {
  console.log('🔧 Connecting to database...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT) || 3306
  });

  console.log('✅ Connected.');

  try {
    // --- BOOKS TABLE ---
    console.log('\n📚 Checking Books table...');
    const bookColumns = [
      { name: 'externalLink', type: 'VARCHAR(500) NULL' },
      { name: 'gradeLevelId', type: 'VARCHAR(36) NULL' },
      { name: 'courseId', type: 'VARCHAR(36) NULL' },
      { name: 'coverImageUrl', type: 'VARCHAR(500) NULL' },
      { name: 'thumbnailUrl', type: 'VARCHAR(500) NULL' }
    ];

    for (const col of bookColumns) {
      try {
        await connection.query(`SELECT ${col.name} FROM books LIMIT 1`);
        console.log(`  ✅ ${col.name} exists`);
      } catch (err: unknown) {
        const mysqlError = err as MySQLError;
        if (mysqlError.code === 'ER_BAD_FIELD_ERROR') {
          console.log(`  ⚠️ ${col.name} missing. Adding...`);
          await connection.query(`ALTER TABLE books ADD COLUMN ${col.name} ${col.type}`);
          console.log(`  ✨ Added ${col.name}`);
        } else {
          console.error(`  ❌ Error checking ${col.name}:`, mysqlError.message);
        }
      }
    }

    // --- USERS TABLE ---
    console.log('\nbusts_in_silhouette Checking Users table...');
    const userColumns = [
      { name: 'twoFactorEnabled', type: 'TINYINT DEFAULT 0' },
      { name: 'twoFactorEmail', type: 'VARCHAR(255) NULL' },
      { name: 'avatarUrl', type: 'VARCHAR(255) NULL' }
    ];

    for (const col of userColumns) {
      try {
        await connection.query(`SELECT ${col.name} FROM users LIMIT 1`);
        console.log(`  ✅ ${col.name} exists`);
      } catch (err: unknown) {
        const mysqlError = err as MySQLError;
        if (mysqlError.code === 'ER_BAD_FIELD_ERROR') {
          console.log(`  ⚠️ ${col.name} missing. Adding...`);
          await connection.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
          console.log(`  ✨ Added ${col.name}`);
        } else {
          console.error(`  ❌ Error checking ${col.name}:`, mysqlError.message);
        }
      }
    }

    // --- DOCUMENT REQUIREMENTS TABLE ---
    console.log('\n📄 Checking Document Requirements table...');
    try {
        await connection.query('SELECT 1 FROM document_requirements LIMIT 1');
        
        const docReqColumns = [
          { name: 'is_initial', type: 'TINYINT DEFAULT 0' },
          { name: 'is_required', type: 'TINYINT DEFAULT 1' },
          { name: 'category_id', type: 'VARCHAR(36) NULL' },
          { name: 'validation_rules', type: 'JSON NULL' },
          { name: 'applicable_grade_levels', type: 'JSON NULL' },
          { name: 'expiration_days', type: 'INT NULL' },
          { name: 'created_by', type: 'VARCHAR(36) NULL' }
        ];
    
        for (const col of docReqColumns) {
          try {
            await connection.query(`SELECT ${col.name} FROM document_requirements LIMIT 1`);
            console.log(`  ✅ ${col.name} exists`);
          } catch (err: unknown) {
            const mysqlError = err as MySQLError;
            if (mysqlError.code === 'ER_BAD_FIELD_ERROR') {
              console.log(`  ⚠️ ${col.name} missing. Adding...`);
              await connection.query(`ALTER TABLE document_requirements ADD COLUMN ${col.name} ${col.type}`);
              console.log(`  ✨ Added ${col.name}`);
            } else {
              console.error(`  ❌ Error checking ${col.name}:`, mysqlError.message);
            }
          }
        }
    } catch (err: unknown) {
        const mysqlError = err as MySQLError;
        if (mysqlError.code === 'ER_NO_SUCH_TABLE') {
            console.log('  ⚠️ Table document_requirements does not exist. Skipping column checks.');
        } else {
            console.error('  ❌ Error checking document_requirements table:', mysqlError.message);
        }
    }

    // --- SUBJECT PREREQUISITES TABLE ---
    console.log('\n🔗 Checking Subject Prerequisites table...');
    try {
        await connection.query('SELECT 1 FROM subject_prerequisites LIMIT 1');
        
        const subjectPrereqColumns = [
          { name: 'category', type: "ENUM('required', 'corequisite') DEFAULT 'required'" }
        ];
    
        for (const col of subjectPrereqColumns) {
          try {
            await connection.query(`SELECT ${col.name} FROM subject_prerequisites LIMIT 1`);
            console.log(`  ✅ ${col.name} exists`);
          } catch (err: unknown) {
            const mysqlError = err as MySQLError;
            if (mysqlError.code === 'ER_BAD_FIELD_ERROR') {
              console.log(`  ⚠️ ${col.name} missing. Adding...`);
              await connection.query(`ALTER TABLE subject_prerequisites ADD COLUMN ${col.name} ${col.type}`);
              console.log(`  ✨ Added ${col.name}`);
            } else {
              console.error(`  ❌ Error checking ${col.name}:`, mysqlError.message);
            }
          }
        }
    } catch (err: unknown) {
        const mysqlError = err as MySQLError;
        if (mysqlError.code === 'ER_NO_SUCH_TABLE') {
            console.log('  ⚠️ Table subject_prerequisites does not exist. Skipping column checks.');
        } else {
            console.error('  ❌ Error checking subject_prerequisites table:', mysqlError.message);
        }
    }

  } catch (error) {
    console.error('❌ Error fixing schema:', error);
  } finally {
    await connection.end();
  }
}

fixSchema();
