import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class AddUserFieldsAndPositionTable1758249590000 implements MigrationInterface {
  name = 'AddUserFieldsAndPositionTable1758249590000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get users table to check existing columns
    const usersTable = await queryRunner.getTable('users');
    
    // Add new columns to users table only if they don't exist
    if (!usersTable?.findColumnByName('middleInitial')) {
      await queryRunner.addColumn('users', new TableColumn({
        name: 'middleInitial',
        type: 'varchar',
        length: '5',
        isNullable: true
      }));
      console.log('✅ Added middleInitial column to users table');
    } else {
      console.log('middleInitial column already exists in users table');
    }

    if (!usersTable?.findColumnByName('username')) {
      await queryRunner.addColumn('users', new TableColumn({
        name: 'username',
        type: 'varchar',
        length: '50',
        isUnique: true
      }));
      console.log('✅ Added username column to users table');
    } else {
      console.log('username column already exists in users table');
    }

    if (!usersTable?.findColumnByName('position')) {
      await queryRunner.addColumn('users', new TableColumn({
        name: 'position',
        type: 'varchar',
        length: '100'
      }));
      console.log('✅ Added position column to users table');
    } else {
      console.log('position column already exists in users table');
    }

    // Check if positions table exists
    const positionsTableExists = await queryRunner.hasTable('positions');
    
    if (!positionsTableExists) {
      // Create positions table
      await queryRunner.createTable(
        new Table({
          name: 'positions',
          columns: [
            {
              name: 'id',
              type: 'varchar',
              length: '36',
              isPrimary: true,
              generationStrategy: 'uuid'
            },
            {
              name: 'name',
              type: 'varchar',
              length: '100',
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
              default: true
            },
            {
              name: 'createdAt',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP'
            },
            {
              name: 'updatedAt',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP'
            }
          ]
        }),
        true
      );

      // Insert default positions from default_users.md
      await queryRunner.query(`
        INSERT INTO positions (id, name, description, isActive) VALUES
        (UUID(), 'Super Administrator', 'System super administrator with full access', true),
        (UUID(), 'System Administrator', 'System administrator with administrative privileges', true),
        (UUID(), 'Registrar II', 'Registrar with level II responsibilities', true),
        (UUID(), 'Teacher', 'Teaching staff member', true),
        (UUID(), 'Staff', 'General staff member', true),
        (UUID(), 'Finance Officer', 'Financial operations officer', true),
        (UUID(), 'Librarian', 'Library management staff', true)
      `);
      console.log('✅ Created positions table and seeded default positions');
    } else {
      console.log('positions table already exists, skipping creation');
      
      // Check if positions are already seeded
      const existingPositions = await queryRunner.query(`SELECT COUNT(*) as count FROM positions`);
      if (existingPositions[0].count === 0) {
        await queryRunner.query(`
          INSERT INTO positions (id, name, description, isActive) VALUES
          (UUID(), 'Super Administrator', 'System super administrator with full access', true),
          (UUID(), 'System Administrator', 'System administrator with administrative privileges', true),
          (UUID(), 'Registrar II', 'Registrar with level II responsibilities', true),
          (UUID(), 'Teacher', 'Teaching staff member', true),
          (UUID(), 'Staff', 'General staff member', true),
          (UUID(), 'Finance Officer', 'Financial operations officer', true),
          (UUID(), 'Librarian', 'Library management staff', true)
        `);
        console.log('✅ Seeded default positions');
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop positions table
    await queryRunner.dropTable('positions');

    // Remove columns from users table
    await queryRunner.dropColumn('users', 'position');
    await queryRunner.dropColumn('users', 'username');
    await queryRunner.dropColumn('users', 'middleInitial');
  }
}