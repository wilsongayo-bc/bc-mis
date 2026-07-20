import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAcademicYearsTable1760271600000 implements MigrationInterface {
  name = 'CreateAcademicYearsTable1760271600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create academic_years table
    await queryRunner.createTable(
      new Table({
        name: 'academic_years',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'year',
            type: 'varchar',
            length: '9',
            isUnique: true,
            comment: 'Academic year in format YYYY-YYYY (e.g., 2024-2025)',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: false,
            comment: 'Only one academic year should be active at a time',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: 'Optional description for the academic year',
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Unique index is already created by the isUnique: true property on the year column

    // Insert default academic years
    await queryRunner.query(`
      INSERT INTO academic_years (year, isActive, description) VALUES
      ('2023-2024', false, 'Academic Year 2023-2024'),
      ('2024-2025', true, 'Academic Year 2024-2025 (Current)'),
      ('2025-2026', false, 'Academic Year 2025-2026'),
      ('2026-2027', false, 'Academic Year 2026-2027')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the table (this will also drop the indexes)
    await queryRunner.dropTable('academic_years');
  }
}