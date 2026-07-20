import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add initial courses:
 * - Bachelor of Science in Information Technology
 * - Bachelor in Technical Vocational Teacher Education major in Computer Programming
 */
export class AddInitialCourses1672531300000 implements MigrationInterface {
  name = 'AddInitialCourses1672531300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existingCourses = await queryRunner.query(`
      SELECT courseCode FROM \`courses\` WHERE \`courseCode\` IN ('BSIT', 'BTVTED-CP')
    `);

    if (existingCourses && existingCourses.length > 0) {
      console.log('ℹ️  Courses already exist, skipping insert');
      return;
    }

    const coursesTable = await queryRunner.getTable('courses');
    const hasDepartmentId = !!coursesTable?.findColumnByName('departmentId');

    if (hasDepartmentId) {
      const departmentsTableExists = await queryRunner.hasTable('departments');
      if (!departmentsTableExists) {
        await queryRunner.query(`
          CREATE TABLE \`departments\` (
            \`id\` varchar(36) NOT NULL,
            \`name\` varchar(100) NOT NULL,
            \`code\` varchar(10) NOT NULL,
            \`description\` text NULL,
            \`isActive\` tinyint NOT NULL DEFAULT 1,
            \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            UNIQUE INDEX \`IDX_departments_code\` (\`code\`),
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB
        `);
      }

      const ensureDepartment = async (code: string, name: string, description: string): Promise<string> => {
        let dept = await queryRunner.query(`SELECT id FROM \`departments\` WHERE \`code\` = '${code}' LIMIT 1`);
        if (!dept || dept.length === 0) {
          await queryRunner.query(`
            INSERT INTO \`departments\` (\`id\`, \`name\`, \`code\`, \`description\`, \`isActive\`, \`createdAt\`, \`updatedAt\`)
            VALUES (UUID(), '${name}', '${code}', '${description}', 1, NOW(), NOW())
          `);
          dept = await queryRunner.query(`SELECT id FROM \`departments\` WHERE \`code\` = '${code}' LIMIT 1`);
        }
        return dept[0].id;
      };

      const itDeptId = await ensureDepartment('IT', 'Information Technology', 'Information Technology Department');
      const techEdDeptId = await ensureDepartment('TECHED', 'Technical Education', 'Technical Education Department');

      await queryRunner.query(`
        INSERT INTO \`courses\` (
          \`id\`,
          \`courseCode\`,
          \`name\`,
          \`description\`,
          \`departmentId\`,
          \`isActive\`,
          \`createdAt\`,
          \`updatedAt\`
        ) VALUES 
        (
          UUID(),
          'BSIT',
          'Bachelor of Science in Information Technology',
          'A comprehensive program that covers computer programming, systems analysis, database management, networking, and emerging technologies. Students will develop skills in software development, IT project management, and digital innovation.',
          '${itDeptId}',
          1,
          NOW(),
          NOW()
        ),
        (
          UUID(),
          'BTVTED-CP',
          'Bachelor in Technical Vocational Teacher Education major in Computer Programming',
          'A specialized program designed to prepare educators for technical and vocational instruction in computer programming. Combines pedagogical training with advanced programming skills, curriculum development, and educational technology integration.',
          '${techEdDeptId}',
          1,
          NOW(),
          NOW()
        )
      `);

      console.log('✅ Initial courses added successfully');
      return;
    }

    await queryRunner.query(`
      INSERT INTO \`courses\` (
        \`id\`,
        \`courseCode\`,
        \`name\`,
        \`description\`,
        \`credits\`,
        \`gradeLevel\`,
        \`department\`,
        \`teacherId\`,
        \`maxStudents\`,
        \`isActive\`,
        \`createdAt\`,
        \`updatedAt\`
      ) VALUES 
      (
        UUID(),
        'BSIT',
        'Bachelor of Science in Information Technology',
        'A comprehensive program that covers computer programming, systems analysis, database management, networking, and emerging technologies. Students will develop skills in software development, IT project management, and digital innovation.',
        0,
        1,
        'Information Technology',
        NULL,
        30,
        1,
        NOW(),
        NOW()
      ),
      (
        UUID(),
        'BTVTED-CP',
        'Bachelor in Technical Vocational Teacher Education major in Computer Programming',
        'A specialized program designed to prepare educators for technical and vocational instruction in computer programming. Combines pedagogical training with advanced programming skills, curriculum development, and educational technology integration.',
        0,
        1,
        'Technical Education',
        NULL,
        30,
        1,
        NOW(),
        NOW()
      )
    `);

    console.log('✅ Initial courses added successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the courses by their course codes
    await queryRunner.query(`
      DELETE FROM \`courses\` 
      WHERE \`courseCode\` IN ('BSIT', 'BTVTED-CP')
    `);
  }
}