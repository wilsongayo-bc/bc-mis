import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPositionsIdColumn1758503200000 implements MigrationInterface {
  name = 'FixPositionsIdColumn1758503200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, clear any existing data that might have truncated IDs
    await queryRunner.query('DELETE FROM positions');
    
    // Alter the id column to be char(36) to properly store UUIDs
    await queryRunner.query('ALTER TABLE positions MODIFY COLUMN id CHAR(36) NOT NULL');
    
    // Re-insert default positions with proper UUID format
    await queryRunner.query(`
      INSERT INTO positions (id, name, description, isActive) VALUES
      ('550e8400-e29b-41d4-a716-446655440001', 'Super Administrator', 'System super administrator with full access', true),
      ('550e8400-e29b-41d4-a716-446655440002', 'System Administrator', 'System administrator with administrative privileges', true),
      ('550e8400-e29b-41d4-a716-446655440003', 'Registrar II', 'Registrar with level II responsibilities', true),
      ('550e8400-e29b-41d4-a716-446655440004', 'Teacher', 'Teaching staff member', true),
      ('550e8400-e29b-41d4-a716-446655440005', 'Staff', 'General staff member', true),
      ('550e8400-e29b-41d4-a716-446655440006', 'Finance Officer', 'Financial operations officer', true),
      ('550e8400-e29b-41d4-a716-446655440007', 'Librarian', 'Library management staff', true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to varchar(36) if needed
    await queryRunner.query('ALTER TABLE positions MODIFY COLUMN id VARCHAR(36) NOT NULL');
  }
}