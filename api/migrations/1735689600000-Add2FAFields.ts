import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class Add2FAFields1735689600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    
    // Add twoFactorEnabled column
    if (!table?.columns.find(column => column.name === 'twoFactorEnabled')) {
      await queryRunner.addColumn('users', new TableColumn({
        name: 'twoFactorEnabled',
        type: 'boolean',
        default: false
      }));
    }

    // Add twoFactorEmail column (email for 2FA verification)
    if (!table?.columns.find(column => column.name === 'twoFactorEmail')) {
      await queryRunner.addColumn('users', new TableColumn({
        name: 'twoFactorEmail',
        type: 'varchar',
        length: '255',
        isNullable: true
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'twoFactorEmail');
    await queryRunner.dropColumn('users', 'twoFactorEnabled');
  }
}
