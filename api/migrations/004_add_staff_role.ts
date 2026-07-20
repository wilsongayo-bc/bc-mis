import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaffRole1756110400000 implements MigrationInterface {
  name = 'AddStaffRole1756110400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Modify the users table role enum to include STAFF and SUPERADMIN
    await queryRunner.query(`
      ALTER TABLE \`users\` MODIFY COLUMN \`role\` 
      enum('SUPERADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'STUDENT', 'REGISTRAR', 'FINANCE', 'LIBRARIAN') NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // First, update any users with STAFF or SUPERADMIN roles to ADMIN
    await queryRunner.query(`
      UPDATE \`users\` SET \`role\` = 'ADMIN' 
      WHERE \`role\` IN ('STAFF', 'SUPERADMIN');
    `);
    
    // Then revert the role enum to the original values
    await queryRunner.query(`
      ALTER TABLE \`users\` MODIFY COLUMN \`role\` 
      enum('ADMIN', 'TEACHER', 'STUDENT', 'REGISTRAR', 'FINANCE', 'LIBRARIAN') NOT NULL;
    `);
  }
}