import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export class SeedInitialData1672531200000 implements MigrationInterface {
  name = 'SeedInitialData1000000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if admin user already exists (by email or username)
    const existingAdmin = await queryRunner.query(`
      SELECT id FROM \`users\` WHERE \`email\` = 'admin@benedictcollege.edu' OR \`username\` = 'admin' LIMIT 1
    `);
    
    if (existingAdmin && existingAdmin.length > 0) {
      console.log('ℹ️  Admin user already exists, skipping seed');
      return;
    }
    
    // Create default admin user
    const adminId = uuidv4();
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await queryRunner.query(`
      INSERT INTO \`users\` (
        \`id\`, \`email\`, \`username\`, \`password\`, \`firstName\`, \`lastName\`, \`position\`, \`role\`, \`isActive\`, \`createdAt\`, \`updatedAt\`
      ) VALUES (
        '${adminId}', 
        'admin@benedictcollege.edu',
        'admin', 
        '${hashedPassword}', 
        'System', 
        'Administrator',
        'System Administrator', 
        'ADMIN', 
        1, 
        NOW(), 
        NOW()
      )
    `);

    // Settings are created in 002_add_settings_table

    console.log('✅ Initial data seeded successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seeded data
    await queryRunner.query(`DELETE FROM \`settings\` WHERE \`id\` IN (1, 2, 3, 4, 5, 6, 7)`);
    await queryRunner.query(`DELETE FROM \`users\` WHERE \`email\` = 'admin@benedictcollege.edu'`);
    
    console.log('✅ Initial data removed successfully');
  }
}
