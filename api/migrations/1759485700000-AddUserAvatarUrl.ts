import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserAvatarUrl1759485700000 implements MigrationInterface {
  name = 'AddUserAvatarUrl1759485700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add avatarUrl column to users table
    await queryRunner.addColumn('users', new TableColumn({
      name: 'avatarUrl',
      type: 'text',
      isNullable: true,
      comment: 'URL to user avatar image stored in Vercel Blob storage'
    }));

    console.log('✅ Added avatarUrl column to users table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove avatarUrl column from users table
    await queryRunner.dropColumn('users', 'avatarUrl');
    
    console.log('✅ Removed avatarUrl column from users table');
  }
}