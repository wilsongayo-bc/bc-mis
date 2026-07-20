import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateSubjects1756973200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if subjects table already exists
    const subjectsTableExists = await queryRunner.hasTable('subjects');
    
    if (!subjectsTableExists) {
      // Create subjects table
      await queryRunner.createTable(
        new Table({
          name: 'subjects',
          columns: [
            {
              name: 'id',
              type: 'varchar',
              length: '36',
              isPrimary: true
            },
            {
              name: 'code',
              type: 'varchar',
              length: '20',
              isNullable: false,
              isUnique: true
            },
            {
              name: 'name',
              type: 'varchar',
              length: '200',
              isNullable: false
            },
            {
              name: 'description',
              type: 'text',
              isNullable: true
            },
            {
              name: 'units',
              type: 'int',
              isNullable: false
            },
            {
              name: 'lectureHours',
              type: 'int',
              isNullable: false,
              default: 0
            },
            {
              name: 'labHours',
              type: 'int',
              isNullable: false,
              default: 0
            },
            {
              name: 'departmentId',
              type: 'varchar',
              length: '36',
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

      // Create unique index for subject code
      await queryRunner.createIndex(
        'subjects',
        new TableIndex({
          name: 'IDX_subjects_code',
          columnNames: ['code'],
          isUnique: true
        })
      );
    } else {
      console.log('Subjects table already exists, skipping creation');
    }

    // Check if subject_prerequisites table already exists
    const prerequisitesTableExists = await queryRunner.hasTable('subject_prerequisites');
    
    if (!prerequisitesTableExists) {
      // Create subject_prerequisites table
      await queryRunner.createTable(
        new Table({
          name: 'subject_prerequisites',
          columns: [
            {
              name: 'id',
              type: 'varchar',
              length: '36',
              isPrimary: true
            },
            {
              name: 'subjectId',
              type: 'varchar',
              length: '36',
              isNullable: false
            },
            {
              name: 'prerequisiteId',
              type: 'varchar',
              length: '36',
              isNullable: false
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

      // Create unique index for subject-prerequisite combination
      await queryRunner.createIndex(
        'subject_prerequisites',
        new TableIndex({
          name: 'IDX_subject_prerequisite_unique',
          columnNames: ['subjectId', 'prerequisiteId'],
          isUnique: true
        })
      );
    } else {
      console.log('Subject prerequisites table already exists, skipping creation');
    }

    // Add foreign key constraints only if tables were just created
    if (!subjectsTableExists) {
      await queryRunner.createForeignKey(
        'subjects',
        new TableForeignKey({
          columnNames: ['departmentId'],
          referencedTableName: 'departments',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'NO ACTION'
        })
      );
    }

    if (!prerequisitesTableExists) {
      await queryRunner.createForeignKey(
        'subject_prerequisites',
        new TableForeignKey({
          columnNames: ['subjectId'],
          referencedTableName: 'subjects',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'NO ACTION'
        })
      );

      await queryRunner.createForeignKey(
        'subject_prerequisites',
        new TableForeignKey({
          columnNames: ['prerequisiteId'],
          referencedTableName: 'subjects',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'NO ACTION'
        })
      );
    }

    // Insert sample subjects data only if subjects table is empty
    const existingSubjects = await queryRunner.query(`SELECT COUNT(*) as count FROM subjects`);
    if (existingSubjects[0].count === 0) {
      // Check if departments exist before inserting
      const departments = await queryRunner.query(`SELECT id FROM departments WHERE code = 'CS' LIMIT 1`);
      if (departments.length > 0) {
        await queryRunner.query(`
          INSERT INTO subjects (id, code, name, description, units, lectureHours, labHours, departmentId) 
          SELECT 
            UUID() as id,
            'CS101' as code,
            'Introduction to Computer Science' as name,
            'Basic concepts of computer science and programming fundamentals' as description,
            3 as units,
            3 as lectureHours,
            0 as labHours,
            d.id as departmentId
          FROM departments d 
          WHERE d.code = 'CS'
          LIMIT 1
        `);

        await queryRunner.query(`
          INSERT INTO subjects (id, code, name, description, units, lectureHours, labHours, departmentId) 
          SELECT 
            UUID() as id,
            'CS102' as code,
            'Programming Fundamentals' as name,
            'Introduction to programming using modern programming languages' as description,
            3 as units,
            2 as lectureHours,
            3 as labHours,
            d.id as departmentId
          FROM departments d 
          WHERE d.code = 'CS'
          LIMIT 1
        `);

        await queryRunner.query(`
          INSERT INTO subjects (id, code, name, description, units, lectureHours, labHours, departmentId) 
          SELECT 
            UUID() as id,
            'MATH101' as code,
            'College Mathematics' as name,
            'Fundamental mathematical concepts for computer science students' as description,
            3 as units,
            3 as lectureHours,
            0 as labHours,
            d.id as departmentId
          FROM departments d 
          WHERE d.code = 'CS'
          LIMIT 1
        `);
        console.log('Inserted sample subjects');
      } else {
        console.log('No CS department found, skipping sample subject insertion');
      }
    } else {
      console.log('Subjects already exist, skipping sample data insertion');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    const subjectPrerequisitesTable = await queryRunner.getTable('subject_prerequisites');
    if (subjectPrerequisitesTable) {
      const foreignKeys = subjectPrerequisitesTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('subject_prerequisites', foreignKey);
      }
    }

    const subjectsTable = await queryRunner.getTable('subjects');
    if (subjectsTable) {
      const foreignKeys = subjectsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('subjects', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('subject_prerequisites', true);
    await queryRunner.dropTable('subjects', true);
  }
}