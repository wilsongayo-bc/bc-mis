import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1672531100000 implements MigrationInterface {
  name = 'InitialSchema1000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` varchar(36) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`username\` varchar(50) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        \`firstName\` varchar(100) NOT NULL,
        \`middleInitial\` varchar(5) NULL,
        \`lastName\` varchar(100) NOT NULL,
        \`position\` varchar(100) NOT NULL,
        \`role\` enum('ADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR', 'FINANCE', 'LIBRARIAN') NOT NULL,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`lastLogin\` datetime NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`),
        UNIQUE INDEX \`IDX_username\` (\`username\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create students table
    await queryRunner.query(`
      CREATE TABLE \`students\` (
        \`id\` varchar(36) NOT NULL,
        \`studentId\` varchar(20) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`dateOfBirth\` date NOT NULL,
        \`gender\` enum('MALE', 'FEMALE', 'OTHER') NOT NULL,
        \`address\` text NOT NULL,
        \`phoneNumber\` varchar(20) NULL,
        \`emergencyContact\` varchar(100) NOT NULL,
        \`emergencyPhone\` varchar(20) NOT NULL,
        \`gradeLevel\` int NOT NULL,
        \`section\` varchar(10) NULL,
        \`enrollmentDate\` date NOT NULL,
        \`status\` enum('ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED') NOT NULL DEFAULT 'ACTIVE',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_7d7f07271ad4ce999880713f05\` (\`studentId\`),
        UNIQUE INDEX \`REL_fb3eff90b11bddf7285f9b4e28\` (\`userId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create employees table
    await queryRunner.query(`
      CREATE TABLE \`employees\` (
        \`id\` varchar(36) NOT NULL,
        \`employeeId\` varchar(20) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`department\` varchar(100) NOT NULL,
        \`position\` varchar(100) NOT NULL,
        \`hireDate\` date NOT NULL,
        \`salary\` decimal(10,2) NULL,
        \`phoneNumber\` varchar(20) NULL,
        \`address\` text NULL,
        \`emergencyContact\` varchar(100) NULL,
        \`emergencyPhone\` varchar(20) NULL,
        \`status\` enum('ACTIVE', 'INACTIVE', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_5e9c9c4e4e9c9c4e4e9c9c4e4e\` (\`employeeId\`),
        UNIQUE INDEX \`REL_c9a09b6d2b9c9c4e4e9c9c4e4e\` (\`userId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create courses table
    await queryRunner.query(`
      CREATE TABLE \`courses\` (
        \`id\` varchar(36) NOT NULL,
        \`courseCode\` varchar(20) NOT NULL,
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
        UNIQUE INDEX \`IDX_3d6e2b9c9c4e4e9c9c4e4e9c9c\` (\`courseCode\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create enrollments table
    await queryRunner.query(`
      CREATE TABLE \`enrollments\` (
        \`id\` varchar(36) NOT NULL,
        \`studentId\` varchar(36) NOT NULL,
        \`courseId\` varchar(36) NOT NULL,
        \`enrollmentDate\` date NOT NULL,
        \`status\` enum('ENROLLED', 'COMPLETED', 'DROPPED', 'FAILED') NOT NULL DEFAULT 'ENROLLED',
        \`grade\` varchar(5) NULL,
        \`finalScore\` decimal(5,2) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create payments table
    await queryRunner.query(`
      CREATE TABLE \`payments\` (
        \`id\` varchar(36) NOT NULL,
        \`studentId\` varchar(36) NOT NULL,
        \`amount\` decimal(10,2) NOT NULL,
        \`type\` enum('TUITION', 'REGISTRATION', 'LIBRARY', 'LABORATORY', 'MISCELLANEOUS') NOT NULL,
        \`status\` enum('PENDING', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
        \`dueDate\` date NOT NULL,
        \`paidDate\` date NULL,
        \`paymentMethod\` enum('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHECK') NULL,
        \`transactionId\` varchar(100) NULL,
        \`description\` text NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create books table
    await queryRunner.query(`
      CREATE TABLE \`books\` (
        \`id\` varchar(36) NOT NULL,
        \`isbn\` varchar(20) NOT NULL,
        \`title\` varchar(300) NOT NULL,
        \`author\` varchar(200) NOT NULL,
        \`publisher\` varchar(200) NULL,
        \`publishedYear\` int NULL,
        \`category\` varchar(100) NOT NULL,
        \`totalCopies\` int NOT NULL DEFAULT 1,
        \`availableCopies\` int NOT NULL DEFAULT 1,
        \`location\` varchar(100) NULL,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_4b9c9c4e4e9c9c4e4e9c9c4e4e\` (\`isbn\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create borrow_records table
    await queryRunner.query(`
      CREATE TABLE \`borrow_records\` (
        \`id\` varchar(36) NOT NULL,
        \`studentId\` varchar(36) NOT NULL,
        \`bookId\` varchar(36) NOT NULL,
        \`borrowDate\` date NOT NULL,
        \`dueDate\` date NOT NULL,
        \`returnDate\` date NULL,
        \`status\` enum('BORROWED', 'RETURNED', 'OVERDUE', 'LOST') NOT NULL DEFAULT 'BORROWED',
        \`renewalCount\` int NOT NULL DEFAULT 0,
        \`fineAmount\` decimal(8,2) NOT NULL DEFAULT 0,
        \`notes\` text NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create schedules table
    await queryRunner.query(`
      CREATE TABLE \`schedules\` (
        \`id\` varchar(36) NOT NULL,
        \`courseId\` varchar(36) NOT NULL,
        \`teacherId\` varchar(36) NOT NULL,
        \`dayOfWeek\` enum('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
        \`startTime\` time NOT NULL,
        \`endTime\` time NOT NULL,
        \`room\` varchar(50) NOT NULL,
        \`semester\` varchar(20) NOT NULL,
        \`academicYear\` varchar(10) NOT NULL,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE \`students\` ADD CONSTRAINT \`FK_fb3eff90b11bddf7285f9b4e281\` 
      FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`employees\` ADD CONSTRAINT \`FK_c9a09b6d2b9c9c4e4e9c9c4e4e9\` 
      FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`courses\` ADD CONSTRAINT \`FK_3d6e2b9c9c4e4e9c9c4e4e9c9c4\` 
      FOREIGN KEY (\`teacherId\`) REFERENCES \`employees\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`enrollments\` ADD CONSTRAINT \`FK_enrollments_student\` 
      FOREIGN KEY (\`studentId\`) REFERENCES \`students\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`enrollments\` ADD CONSTRAINT \`FK_enrollments_course\` 
      FOREIGN KEY (\`courseId\`) REFERENCES \`courses\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`payments\` ADD CONSTRAINT \`FK_payments_student\` 
      FOREIGN KEY (\`studentId\`) REFERENCES \`students\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`borrow_records\` ADD CONSTRAINT \`FK_borrow_records_student\` 
      FOREIGN KEY (\`studentId\`) REFERENCES \`students\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`borrow_records\` ADD CONSTRAINT \`FK_borrow_records_book\` 
      FOREIGN KEY (\`bookId\`) REFERENCES \`books\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`schedules\` ADD CONSTRAINT \`FK_schedules_course\` 
      FOREIGN KEY (\`courseId\`) REFERENCES \`courses\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`schedules\` ADD CONSTRAINT \`FK_schedules_teacher\` 
      FOREIGN KEY (\`teacherId\`) REFERENCES \`employees\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(`ALTER TABLE \`schedules\` DROP FOREIGN KEY \`FK_schedules_teacher\``);
    await queryRunner.query(`ALTER TABLE \`schedules\` DROP FOREIGN KEY \`FK_schedules_course\``);
    await queryRunner.query(`ALTER TABLE \`borrow_records\` DROP FOREIGN KEY \`FK_borrow_records_book\``);
    await queryRunner.query(`ALTER TABLE \`borrow_records\` DROP FOREIGN KEY \`FK_borrow_records_student\``);
    await queryRunner.query(`ALTER TABLE \`payments\` DROP FOREIGN KEY \`FK_payments_student\``);
    await queryRunner.query(`ALTER TABLE \`enrollments\` DROP FOREIGN KEY \`FK_enrollments_course\``);
    await queryRunner.query(`ALTER TABLE \`enrollments\` DROP FOREIGN KEY \`FK_enrollments_student\``);
    await queryRunner.query(`ALTER TABLE \`courses\` DROP FOREIGN KEY \`FK_3d6e2b9c9c4e4e9c9c4e4e9c9c4\``);
    await queryRunner.query(`ALTER TABLE \`employees\` DROP FOREIGN KEY \`FK_c9a09b6d2b9c9c4e4e9c9c4e4e9\``);
    await queryRunner.query(`ALTER TABLE \`students\` DROP FOREIGN KEY \`FK_fb3eff90b11bddf7285f9b4e281\``);

    // Drop tables
    await queryRunner.query(`DROP TABLE \`schedules\``);
    await queryRunner.query(`DROP TABLE \`borrow_records\``);
    await queryRunner.query(`DROP TABLE \`books\``);
    await queryRunner.query(`DROP TABLE \`payments\``);
    await queryRunner.query(`DROP TABLE \`enrollments\``);
    await queryRunner.query(`DROP TABLE \`courses\``);
    await queryRunner.query(`DROP TABLE \`employees\``);
    await queryRunner.query(`DROP TABLE \`students\``);
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}