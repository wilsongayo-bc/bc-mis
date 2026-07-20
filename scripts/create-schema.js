/**
 * Standalone script to create database schema
 * This script can be run independently to create all necessary tables
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createDatabaseSchema() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    console.log('✅ Connected to database');
    console.log('Database:', process.env.DB_DATABASE);
    console.log('Host:', process.env.DB_HOST);
    
    // Check if tables already exist
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Existing tables:', tables.length);
    
    if (tables.length > 0) {
      console.log('Tables found:', tables.map(t => Object.values(t)[0]));
      console.log('⚠️  Database already has tables. Skipping schema creation.');
      return;
    }
    
    console.log('📝 Creating database schema...');
    
    // Create users table
    await connection.execute(`
      CREATE TABLE \`users\` (
        \`id\` varchar(36) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        \`firstName\` varchar(100) NOT NULL,
        \`lastName\` varchar(100) NOT NULL,
        \`role\` enum('ADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR', 'FINANCE', 'LIBRARIAN', 'STAFF') NOT NULL,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`lastLogin\` datetime NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    console.log('✅ Created users table');
    
    // Create students table
    await connection.execute(`
      CREATE TABLE \`students\` (
        \`id\` varchar(36) NOT NULL,
        \`studentId\` varchar(20) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`dateOfBirth\` date NULL,
        \`gender\` enum('MALE', 'FEMALE', 'OTHER') NULL,
        \`address\` text NULL,
        \`phoneNumber\` varchar(20) NULL,
        \`emergencyContact\` varchar(100) NULL,
        \`emergencyPhone\` varchar(20) NULL,
        \`gradeLevel\` int NULL,
        \`section\` varchar(10) NULL,
        \`enrollmentDate\` date NULL,
        \`status\` enum('ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'PENDING', 'REGISTERED') NOT NULL DEFAULT 'ACTIVE',
        \`guardianName\` varchar(200) NULL,
        \`guardianPhone\` varchar(20) NULL,
        \`guardianEmail\` varchar(255) NULL,
        \`guardianAddress\` text NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_7d7f07271ad4ce999880713f05\` (\`studentId\`),
        UNIQUE INDEX \`REL_fb3eff90b11bddf7285f9b4e28\` (\`userId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    console.log('✅ Created students table');
    
    // Create employees table
    await connection.execute(`
      CREATE TABLE \`employees\` (
        \`id\` varchar(36) NOT NULL,
        \`employeeId\` varchar(20) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`department\` varchar(100) NOT NULL,
        \`hireDate\` date NOT NULL,
        \`salary\` decimal(10,2) NULL,
        \`phoneNumber\` varchar(20) NULL,
        \`address\` text NULL,
        \`emergencyContact\` varchar(100) NULL,
        \`emergencyPhone\` varchar(20) NULL,
        \`status\` enum('ACTIVE', 'INACTIVE', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
        \`positionId\` varchar(36) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_5e9c9c4e4e9c9c4e4e9c9c4e4e\` (\`employeeId\`),
        UNIQUE INDEX \`REL_c9a09b6d2b9c9c4e4e9c9c4e4e\` (\`userId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    console.log('✅ Created employees table');
    
    // Create positions table
    await connection.execute(`
      CREATE TABLE \`positions\` (
        \`id\` varchar(36) NOT NULL,
        \`title\` varchar(100) NOT NULL,
        \`description\` text NULL,
        \`department\` varchar(100) NOT NULL,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    console.log('✅ Created positions table');
    
    // Create subjects table
    await connection.execute(`
      CREATE TABLE \`subjects\` (
        \`id\` varchar(36) NOT NULL,
        \`subjectCode\` varchar(20) NOT NULL,
        \`name\` varchar(200) NOT NULL,
        \`description\` text NULL,
        \`credits\` int NOT NULL,
        \`gradeLevel\` int NOT NULL,
        \`department\` varchar(100) NOT NULL,
        \`teacherId\` varchar(36) NULL,
        \`maxStudents\` int NOT NULL DEFAULT 30,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_3d6e2b9c9c4e4e9c9c4e4e9c9c\` (\`subjectCode\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    console.log('✅ Created subjects table');
    
    // Create other essential tables...
    await connection.execute(`
      CREATE TABLE \`enrollments\` (
        \`id\` varchar(36) NOT NULL,
        \`studentId\` varchar(36) NOT NULL,
        \`subjectId\` varchar(36) NOT NULL,
        \`enrollmentDate\` date NOT NULL,
        \`status\` enum('ENROLLED', 'COMPLETED', 'DROPPED', 'FAILED') NOT NULL DEFAULT 'ENROLLED',
        \`grade\` varchar(5) NULL,
        \`finalScore\` decimal(5,2) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    console.log('✅ Created enrollments table');
    
    // Create settings table
    await connection.execute(`
      CREATE TABLE \`settings\` (
        \`id\` varchar(36) NOT NULL,
        \`key\` varchar(100) NOT NULL,
        \`value\` text NOT NULL,
        \`description\` text NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_settings_key\` (\`key\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    console.log('✅ Created settings table');
    
    // Add foreign key constraints
    await connection.execute(`
      ALTER TABLE \`students\` ADD CONSTRAINT \`FK_fb3eff90b11bddf7285f9b4e281\` 
      FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    
    await connection.execute(`
      ALTER TABLE \`employees\` ADD CONSTRAINT \`FK_c9a09b6d2b9c9c4e4e9c9c4e4e9\` 
      FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    
    await connection.execute(`
      ALTER TABLE \`employees\` ADD CONSTRAINT \`FK_employees_position\` 
      FOREIGN KEY (\`positionId\`) REFERENCES \`positions\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    
    await connection.execute(`
      ALTER TABLE \`subjects\` ADD CONSTRAINT \`FK_subjects_teacher\` 
      FOREIGN KEY (\`teacherId\`) REFERENCES \`employees\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    
    await connection.execute(`
      ALTER TABLE \`enrollments\` ADD CONSTRAINT \`FK_enrollments_student\` 
      FOREIGN KEY (\`studentId\`) REFERENCES \`students\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    
    await connection.execute(`
      ALTER TABLE \`enrollments\` ADD CONSTRAINT \`FK_enrollments_subject\` 
      FOREIGN KEY (\`subjectId\`) REFERENCES \`subjects\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    
    console.log('✅ Added foreign key constraints');
    
    // Verify tables were created
    const [newTables] = await connection.execute('SHOW TABLES');
    console.log('\n🎉 Database schema created successfully!');
    console.log('Total tables created:', newTables.length);
    console.log('Tables:', newTables.map(t => Object.values(t)[0]).join(', '));
    
  } catch (error) {
    console.error('❌ Error creating database schema:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  createDatabaseSchema()
    .then(() => {
      console.log('\n✅ Schema creation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Schema creation failed:', error);
      process.exit(1);
    });
}

export { createDatabaseSchema };