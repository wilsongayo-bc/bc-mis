import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGradeLevelsTable1708000000000 implements MigrationInterface {
  name = 'CreateGradeLevelsTable1708000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if grade_levels table already exists
    const tableExists = await queryRunner.hasTable('grade_levels');
    
    if (tableExists) {
      console.log('grade_levels table already exists, skipping creation');
      return;
    }
    
    // Create grade_levels table
    await queryRunner.query(`
      CREATE TABLE \`grade_levels\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(50) NOT NULL,
        \`description\` text NULL,
        \`level_order\` int NOT NULL,
        \`min_age\` int NULL,
        \`max_age\` int NULL,
        \`max_students\` int NOT NULL DEFAULT 30,
        \`academic_year\` varchar(20) NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_grade_levels_name\` (\`name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Check if students table exists and has grade_level_id column before adding FK
    // (It should, from FixGradeLevelColumn migration)
    const _table = await queryRunner.getTable('students');
    const hasColumn = await queryRunner.hasColumn('students', 'grade_level_id');
    
    if (hasColumn) {
      // We can try to add the FK constraint now, but if data is inconsistent (orphaned IDs), it might fail.
      // Given this is a fix for a missing table, we'll assume we just need the table first.
      // But adding FK is good practice if we can.
      
      // Let's first ensure we don't have any invalid grade_level_ids in students
      // (If the table didn't exist, any non-null grade_level_id is technically invalid unless we insert matching rows)
      // Since we are creating the table EMPTY, any existing grade_level_id in students will fail FK check immediately.
      // So we MUST NOT add FK here unless we also seed data or set IDs to NULL.
      
      // Plan: Create table -> Seed default data -> (Optional) Link FK
      // For now, just creating the table solves the "Table doesn't exist" error.
    }
    
    // Seed default grade levels only if table is empty
    const existingLevels = await queryRunner.query(`SELECT COUNT(*) as count FROM \`grade_levels\``);
    if (existingLevels[0].count === 0) {
      // Per user request: Disable K-12, Enable First Year - Fourth Year (College)
      await queryRunner.query(`
        INSERT INTO \`grade_levels\` (\`id\`, \`name\`, \`description\`, \`level_order\`, \`academic_year\`, \`is_active\`, \`created_at\`, \`updated_at\`) VALUES
        (UUID(), 'Kindergarten', 'Kindergarten Level', 0, '2024-2025', 0, NOW(), NOW()),
        (UUID(), 'Grade 1', 'Grade 1 Level', 1, '2024-2025', 0, NOW(), NOW()),
        (UUID(), 'Grade 2', 'Grade 2 Level', 2, '2024-2025', 0, NOW(), NOW()),
        (UUID(), 'Grade 3', 'Grade 3 Level', 3, '2024-2025', 0, NOW(), NOW()),
        (UUID(), 'Grade 4', 'Grade 4 Level', 4, '2024-2025', 0, NOW(), NOW()),
        (UUID(), 'Grade 5', 'Grade 5 Level', 5, '2024-2025', 0, NOW(), NOW()),
        (UUID(), 'Grade 6', 'Grade 6 Level', 6, '2024-2025', 0, NOW(), NOW()),
        (UUID(), 'Grade 7', 'Grade 7 Junior High', 7, '2024-2025', 0, NOW(), NOW()),
        (UUID(), 'Grade 8', 'Grade 8 Junior High', 8, '2024-2025', 0, NOW(), NOW()),
        (UUID(), 'Grade 9', 'Grade 9 Junior High', 9, '2024-2025', 0, NOW(), NOW()),
        (UUID(), 'Grade 10', 'Grade 10 Junior High', 10, '2024-2025', 0, NOW(), NOW()),
        (UUID(), 'Grade 11', 'Grade 11 Senior High', 11, '2024-2025', 0, NOW(), NOW()),
        (UUID(), 'Grade 12', 'Grade 12 Senior High', 12, '2024-2025', 0, NOW(), NOW()),
        (UUID(), 'First Year', 'College First Year', 13, '2024-2025', 1, NOW(), NOW()),
        (UUID(), 'Second Year', 'College Second Year', 14, '2024-2025', 1, NOW(), NOW()),
        (UUID(), 'Third Year', 'College Third Year', 15, '2024-2025', 1, NOW(), NOW()),
        (UUID(), 'Fourth Year', 'College Fourth Year', 16, '2024-2025', 1, NOW(), NOW())
      `);
      console.log('✅ Seeded default grade levels');
    } else {
      console.log('Grade levels already exist, skipping seed');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`grade_levels\``);
  }
}
