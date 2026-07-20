import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CourseManagementRedesign1756533000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if departments table exists
    const departmentsTableExists = await queryRunner.hasTable('departments');
    
    if (!departmentsTableExists) {
      // Create departments table
      await queryRunner.createTable(
        new Table({
          name: 'departments',
          columns: [
            {
              name: 'id',
              type: 'varchar',
              length: '36',
              isPrimary: true
            },
            {
              name: 'name',
              type: 'varchar',
              length: '100',
              isNullable: false
            },
            {
              name: 'code',
              type: 'varchar',
              length: '10',
              isNullable: false,
              isUnique: true
            },
            {
              name: 'description',
              type: 'text',
              isNullable: true
            },
            {
              name: 'isActive',
              type: 'boolean',
              default: 'true'
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP'
            },
            {
              name: 'updatedAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP'
            }
          ]
        })
      );

      // Insert initial departments
      await queryRunner.query(`
        INSERT INTO departments (id, name, code, description) VALUES 
        (UUID(), 'Computer Studies', 'CS', 'Department of Computer Studies and Information Technology'),
        (UUID(), 'Education', 'EDUC', 'Department of Education and Teacher Training')
      `);
    } else {
      console.log('Departments table already exists, skipping creation');
      
      // Check if departments exist, if not insert them
      const deptCount = await queryRunner.query(`SELECT COUNT(*) as count FROM departments`);
      if (deptCount[0].count === 0) {
        await queryRunner.query(`
          INSERT INTO departments (id, name, code, description) VALUES 
          (UUID(), 'Computer Studies', 'CS', 'Department of Computer Studies and Information Technology'),
          (UUID(), 'Education', 'EDUC', 'Department of Education and Teacher Training')
        `);
      }
    }

    // Check if course_sections table exists
    const courseSectionsTableExists = await queryRunner.hasTable('course_sections');
    
    if (!courseSectionsTableExists) {
      // Create course_sections table
      await queryRunner.createTable(
        new Table({
          name: 'course_sections',
          columns: [
            {
              name: 'id',
              type: 'varchar',
              length: '36',
              isPrimary: true
            },
            {
              name: 'courseId',
              type: 'varchar',
              length: '36',
              isNullable: false
            },
            {
              name: 'yearLevel',
              type: 'enum',
              enum: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
              isNullable: false
            },
            {
              name: 'sectionName',
              type: 'varchar',
              length: '10',
              isNullable: false
            },
            {
              name: 'credits',
              type: 'int',
              isNullable: false
            },
            {
              name: 'teacherId',
              type: 'varchar',
              length: '36',
              isNullable: true
            },
            {
              name: 'maxStudents',
              type: 'int',
              isNullable: false
            },
            {
              name: 'semester',
              type: 'enum',
              enum: ['First Semester', 'Second Semester', 'Summer'],
              default: "'First Semester'"
            },
            {
              name: 'academicYear',
              type: 'varchar',
              length: '10',
              isNullable: false
            },
            {
              name: 'isActive',
              type: 'boolean',
              default: 'true'
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP'
            },
            {
              name: 'updatedAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP'
            }
          ]
        })
      );

      // Create unique index for course sections
      await queryRunner.createIndex(
        'course_sections',
        new TableIndex({
          name: 'IDX_course_section_unique',
          columnNames: ['courseId', 'yearLevel', 'sectionName', 'semester', 'academicYear'],
          isUnique: true
        })
      );
    } else {
      console.log('Course sections table already exists, skipping creation');
    }

    // Add departmentId column to courses table if it doesn't exist
    const coursesTable = await queryRunner.getTable('courses');
    const hasDepartmentId = coursesTable?.findColumnByName('departmentId');
    
    if (!hasDepartmentId) {
      await queryRunner.query(`
        ALTER TABLE courses ADD COLUMN departmentId VARCHAR(36)
      `);

      // Migrate existing course data to departments (only if we have a department column to migrate from)
      const hasOldDepartment = coursesTable?.findColumnByName('department');
      if (hasOldDepartment) {
        await queryRunner.query(`
          UPDATE courses 
          SET departmentId = (
            SELECT id FROM departments 
            WHERE (courses.department LIKE '%Computer%' OR courses.department LIKE '%IT%' OR courses.department LIKE '%Information%') 
            AND departments.code = 'CS'
            LIMIT 1
          )
          WHERE courses.department LIKE '%Computer%' OR courses.department LIKE '%IT%' OR courses.department LIKE '%Information%'
        `);

        await queryRunner.query(`
          UPDATE courses 
          SET departmentId = (
            SELECT id FROM departments 
            WHERE departments.code = 'EDUC'
            LIMIT 1
          )
          WHERE departmentId IS NULL
        `);
      } else {
        // No old department column, just set all to CS department
        await queryRunner.query(`
          UPDATE courses 
          SET departmentId = (
            SELECT id FROM departments 
            WHERE departments.code = 'CS'
            LIMIT 1
          )
          WHERE departmentId IS NULL
        `);
      }
    } else {
      console.log('departmentId column already exists in courses table');
    }

    // Create course sections from existing courses (only if we have the necessary columns)
    // Check if courses table has the old columns we need
    const hasCredits = coursesTable?.findColumnByName('credits');
    const hasGradeLevel = coursesTable?.findColumnByName('gradeLevel');
    const hasTeacherId = coursesTable?.findColumnByName('teacherId');
    const hasMaxStudents = coursesTable?.findColumnByName('maxStudents');
    
    // Only create course sections if we have data to migrate
    if (hasCredits && hasGradeLevel && hasMaxStudents) {
      const existingSections = await queryRunner.query(`SELECT COUNT(*) as count FROM course_sections`);
      if (existingSections[0].count === 0) {
        await queryRunner.query(`
          INSERT INTO course_sections (id, courseId, yearLevel, sectionName, credits, teacherId, maxStudents, academicYear)
          SELECT 
            UUID() as id,
            c.id as courseId,
            CASE 
              WHEN c.gradeLevel = 1 THEN 'First Year'
              WHEN c.gradeLevel = 2 THEN 'Second Year'
              WHEN c.gradeLevel = 3 THEN 'Third Year'
              WHEN c.gradeLevel = 4 THEN 'Fourth Year'
              ELSE 'First Year'
            END as yearLevel,
            'A' as sectionName,
            c.credits,
            ${hasTeacherId ? 'c.teacherId' : 'NULL'},
            c.maxStudents,
            '2024-25' as academicYear
          FROM courses c
        `);
        console.log('Migrated existing courses to course_sections');
      }
    } else {
      console.log('Skipping course section migration - old columns not found');
    }

    // Add foreign key constraints
    const coursesForeignKeys = coursesTable?.foreignKeys || [];
    const hasDepartmentFK = coursesForeignKeys.some(fk => fk.columnNames.includes('departmentId'));
    
    if (!hasDepartmentFK && hasDepartmentId) {
      await queryRunner.createForeignKey(
        'courses',
        new TableForeignKey({
          columnNames: ['departmentId'],
          referencedTableName: 'departments',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT'
        })
      );
    }

    if (courseSectionsTableExists) {
      const sectionsTable = await queryRunner.getTable('course_sections');
      const sectionsForeignKeys = sectionsTable?.foreignKeys || [];
      
      if (!sectionsForeignKeys.some(fk => fk.columnNames.includes('courseId'))) {
        await queryRunner.createForeignKey(
          'course_sections',
          new TableForeignKey({
            columnNames: ['courseId'],
            referencedTableName: 'courses',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          })
        );
      }

      if (!sectionsForeignKeys.some(fk => fk.columnNames.includes('teacherId'))) {
        await queryRunner.createForeignKey(
          'course_sections',
          new TableForeignKey({
            columnNames: ['teacherId'],
            referencedTableName: 'employees',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL'
          })
        );
      }
    }

    // Add courseSectionId to enrollments table
    const enrollmentsTable = await queryRunner.getTable('enrollments');
    const hasCourseSectionId = enrollmentsTable?.findColumnByName('courseSectionId');
    
    if (!hasCourseSectionId) {
      await queryRunner.query(`
        ALTER TABLE enrollments ADD COLUMN courseSectionId VARCHAR(36)
      `);

      // Migrate enrollment data to course sections
      await queryRunner.query(`
        UPDATE enrollments e
        SET courseSectionId = (
          SELECT cs.id 
          FROM course_sections cs 
          WHERE cs.courseId = e.courseId 
          LIMIT 1
        )
      `);

      await queryRunner.createForeignKey(
        'enrollments',
        new TableForeignKey({
          columnNames: ['courseSectionId'],
          referencedTableName: 'course_sections',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE'
        })
      );
    } else {
      console.log('courseSectionId column already exists in enrollments table');
    }

    // Add courseSectionId to schedules table
    const schedulesTable = await queryRunner.getTable('schedules');
    const hasScheduleCourseSectionId = schedulesTable?.findColumnByName('courseSectionId');
    
    if (!hasScheduleCourseSectionId) {
      await queryRunner.query(`
        ALTER TABLE schedules ADD COLUMN courseSectionId VARCHAR(36)
      `);

      // Migrate schedule data to course sections
      await queryRunner.query(`
        UPDATE schedules s
        SET courseSectionId = (
          SELECT cs.id 
          FROM course_sections cs 
          WHERE cs.courseId = s.courseId 
          LIMIT 1
        )
      `);

      await queryRunner.createForeignKey(
        'schedules',
        new TableForeignKey({
          columnNames: ['courseSectionId'],
          referencedTableName: 'course_sections',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE'
        })
      );
    } else {
      console.log('courseSectionId column already exists in schedules table');
    }

    // Remove old columns from courses table
    // Only drop columns if they exist
    const refreshedCoursesTable = await queryRunner.getTable('courses');
    
    // First drop foreign key constraints if they exist
    const teacherFK = refreshedCoursesTable?.foreignKeys.find(fk => fk.columnNames.includes('teacherId'));
    if (teacherFK) {
      await queryRunner.dropForeignKey('courses', teacherFK);
    }
    
    // Then drop the columns if they exist
    const columnsToRemove = ['credits', 'gradeLevel', 'department', 'teacherId', 'maxStudents'];
    for (const columnName of columnsToRemove) {
      const hasColumn = refreshedCoursesTable?.findColumnByName(columnName);
      if (hasColumn) {
        await queryRunner.query(`ALTER TABLE courses DROP COLUMN ${columnName}`);
        console.log(`Dropped column ${columnName} from courses table`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This is a complex migration, down migration would be extensive
    // For now, we'll just drop the new tables and columns
    await queryRunner.query(`ALTER TABLE schedules DROP COLUMN courseSectionId`);
    await queryRunner.query(`ALTER TABLE enrollments DROP COLUMN courseSectionId`);
    await queryRunner.query(`ALTER TABLE courses DROP COLUMN departmentId`);
    await queryRunner.dropTable('course_sections');
    await queryRunner.dropTable('departments');
  }
}