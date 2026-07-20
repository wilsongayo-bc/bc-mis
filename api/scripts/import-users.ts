/**
 * User Import Script
 * Imports faculty and staff members from CSV data into the database
 * Maps positions to appropriate system roles and generates secure passwords
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import bcrypt from 'bcrypt';

interface CSVUserData {
  lastName: string;
  firstName: string;
  middleInitial: string;
  position: string;
  username: string;
  email: string;
}

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: string[];
}

class UserImporter {
  private readonly DEFAULT_PASSWORD = 'Welcome2024!';
  
  // Position to Role mapping
  private readonly POSITION_ROLE_MAP: Record<string, UserRole> = {
    'College President': UserRole.ADMIN,
    'Associate Professor I': UserRole.TEACHER,
    'Associate Professor II': UserRole.TEACHER,
    'Assistant Professor I': UserRole.TEACHER,
    'Assistant Professor II': UserRole.TEACHER,
    'Professor': UserRole.TEACHER,
    'Instructor I': UserRole.TEACHER,
    'Instructor II': UserRole.TEACHER,
    'Instructor III': UserRole.TEACHER,
    'Librarian I': UserRole.LIBRARIAN,
    'Librarian II': UserRole.LIBRARIAN,
    'Registrar I': UserRole.STAFF,
    'Registrar II': UserRole.STAFF,
    'HR Assistant': UserRole.STAFF,
    'Nurse I': UserRole.STAFF,
    'Admin Aide I': UserRole.STAFF,
    'Admin Aide II': UserRole.STAFF,
    'Admin Aide III': UserRole.STAFF,
  };

  // CSV data from the provided list
  private readonly CSV_DATA: CSVUserData[] = [
    {
      lastName: 'ALVAREZ',
      firstName: 'MA. OLGA',
      middleInitial: 'DC',
      position: 'College President',
      username: 'malvarez',
      email: 'malvarez@benedictcollege.com'
    },
    {
      lastName: 'GUMOLON',
      firstName: 'PREACIOUS',
      middleInitial: 'G',
      position: 'Associate Professor I',
      username: 'pgumolon',
      email: 'pgumolon@benedictcollege.com'
    },
    {
      lastName: 'BETOS',
      firstName: 'SARAH',
      middleInitial: 'P',
      position: 'Associate Professor I',
      username: 'sbetos',
      email: 'sbetos@benedictcollege.com'
    },
    {
      lastName: 'YAMILO',
      firstName: 'LENY',
      middleInitial: 'B',
      position: 'Registrar II',
      username: 'lyamilo',
      email: 'lyamilo@benedictcollege.com'
    },
    {
      lastName: 'LAPA',
      firstName: 'MAY GRACE',
      middleInitial: 'M',
      position: 'Librarian II',
      username: 'mlapa',
      email: 'mlapa@benedictcollege.com'
    },
    {
      lastName: 'LAMBUNAO',
      firstName: 'SHERIEHANE',
      middleInitial: 'A',
      position: 'Nurse I',
      username: 'slambunao',
      email: 'slambunao@benedictcollege.com'
    },
    {
      lastName: 'LABASBAS',
      firstName: 'AILEEN',
      middleInitial: 'L',
      position: 'HR Assistant',
      username: 'alabasbas',
      email: 'alabasbas@benedictcollege.com'
    },
    {
      lastName: 'MONTICOD',
      firstName: 'EULUDOSA ROSE',
      middleInitial: 'T',
      position: 'Instructor III',
      username: 'emonticod',
      email: 'emonticod@benedictcollege.com'
    },
    {
      lastName: 'GALORIO',
      firstName: 'SHIELA',
      middleInitial: 'A',
      position: 'Instructor III',
      username: 'sgalorio',
      email: 'sgalorio@benedictcollege.com'
    },
    {
      lastName: 'BUTLIG',
      firstName: 'JUNEL',
      middleInitial: 'C',
      position: 'Instructor I',
      username: 'jbutlig',
      email: 'jbutlig@benedictcollege.com'
    },
    {
      lastName: 'DAGMANG',
      firstName: 'CZARINA CATHERINE',
      middleInitial: 'A',
      position: 'Instructor I',
      username: 'cdagmang',
      email: 'cdagmang@benedictcollege.com'
    },
    {
      lastName: 'DIABORDO',
      firstName: 'RAFAEL',
      middleInitial: 'V',
      position: 'Instructor I',
      username: 'rdiabordo',
      email: 'rdiabordo@benedictcollege.com'
    },
    {
      lastName: 'MAUSISA',
      firstName: 'SARAH',
      middleInitial: 'B',
      position: 'Instructor I',
      username: 'smausisa',
      email: 'smausisa@benedictcollege.com'
    },
    {
      lastName: 'TEMARIO',
      firstName: 'MAUREEN ALEXANDRA',
      middleInitial: 'E',
      position: 'Instructor I',
      username: 'mtemario',
      email: 'mtemario@benedictcollege.com'
    },
    {
      lastName: 'CADAO',
      firstName: 'ZENAIDA',
      middleInitial: 'H',
      position: 'Admin Aide III',
      username: 'zcadao',
      email: 'zcadao@benedictcollege.com'
    }
  ];

  private mapPositionToRole(position: string): UserRole {
    const role = this.POSITION_ROLE_MAP[position];
    if (!role) {
      console.warn(`⚠️  Unknown position: ${position}, defaulting to STAFF`);
      return UserRole.STAFF;
    }
    return role;
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  private validateUserData(userData: CSVUserData): string[] {
    const errors: string[] = [];

    if (!userData.firstName?.trim()) {
      errors.push('First name is required');
    }
    if (!userData.lastName?.trim()) {
      errors.push('Last name is required');
    }
    if (!userData.email?.trim()) {
      errors.push('Email is required');
    }
    if (!userData.username?.trim()) {
      errors.push('Username is required');
    }
    if (!userData.position?.trim()) {
      errors.push('Position is required');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (userData.email && !emailRegex.test(userData.email)) {
      errors.push('Invalid email format');
    }

    return errors;
  }

  async importUsers(): Promise<ImportResult> {
    const userRepo = AppDataSource.getRepository(User);
    const result: ImportResult = {
      total: this.CSV_DATA.length,
      created: 0,
      skipped: 0,
      errors: []
    };

    console.log('🚀 Starting user import process...');
    console.log(`📊 Total users to process: ${result.total}`);
    console.log('');

    for (let i = 0; i < this.CSV_DATA.length; i++) {
      const userData = this.CSV_DATA[i];
      const userIndex = i + 1;

      try {
        console.log(`[${userIndex}/${result.total}] Processing: ${userData.firstName} ${userData.lastName}`);

        // Validate user data
        const validationErrors = this.validateUserData(userData);
        if (validationErrors.length > 0) {
          const errorMsg = `Validation failed for ${userData.firstName} ${userData.lastName}: ${validationErrors.join(', ')}`;
          result.errors.push(errorMsg);
          console.log(`❌ ${errorMsg}`);
          continue;
        }

        // Check for existing user by email or username
        const existingUser = await userRepo.findOne({
          where: [
            { email: userData.email },
            { username: userData.username }
          ]
        });

        if (existingUser) {
          result.skipped++;
          console.log(`⏭️  User already exists: ${userData.email} or ${userData.username}`);
          continue;
        }

        // Map position to role
        const role = this.mapPositionToRole(userData.position);

        // Hash password
        const hashedPassword = await this.hashPassword(this.DEFAULT_PASSWORD);

        // Create new user
        const newUser = userRepo.create({
          email: userData.email,
          username: userData.username,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          middleInitial: userData.middleInitial || null,
          position: userData.position,
          role: role,
          isActive: true
        });

        await userRepo.save(newUser);
        result.created++;
        console.log(`✅ Created user: ${userData.firstName} ${userData.lastName} (${role})`);

      } catch (error) {
        const errorMsg = `Failed to create user ${userData.firstName} ${userData.lastName}: ${error}`;
        result.errors.push(errorMsg);
        console.log(`❌ ${errorMsg}`);
      }
    }

    return result;
  }

  printSummary(result: ImportResult): void {
    console.log('');
    console.log('📋 IMPORT SUMMARY');
    console.log('================');
    console.log(`Total users processed: ${result.total}`);
    console.log(`✅ Successfully created: ${result.created}`);
    console.log(`⏭️  Skipped (already exist): ${result.skipped}`);
    console.log(`❌ Errors: ${result.errors.length}`);
    console.log('');

    if (result.errors.length > 0) {
      console.log('🚨 ERRORS:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      console.log('');
    }

    // Print role distribution
    console.log('👥 ROLE DISTRIBUTION:');
    const roleCount: Record<string, number> = {};
    this.CSV_DATA.forEach(user => {
      const role = this.mapPositionToRole(user.position);
      roleCount[role] = (roleCount[role] || 0) + 1;
    });

    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} users`);
    });
    console.log('');

    console.log('🔐 DEFAULT PASSWORD: Welcome2024!');
    console.log('⚠️  Users should change their passwords on first login');
  }

  printUserList(): void {
    console.log('📝 USERS TO BE IMPORTED:');
    console.log('========================');
    
    this.CSV_DATA.forEach((user, index) => {
      const role = this.mapPositionToRole(user.position);
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.middleInitial})`);
      console.log(`   Position: ${user.position}`);
      console.log(`   Role: ${role}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log('');
    });
  }
}

async function main() {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established');
    }

    const importer = new UserImporter();
    
    // Print user list first
    importer.printUserList();
    
    // Perform import
    const result = await importer.importUsers();
    
    // Print summary
    importer.printSummary(result);

    // Close database connection
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');

    // Exit with appropriate code
    process.exit(result.errors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error during import:', error);
    
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

export { UserImporter, CSVUserData, ImportResult };