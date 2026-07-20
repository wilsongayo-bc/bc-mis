import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserMustChangePassword1783331300000 implements MigrationInterface {
  name = 'AddUserMustChangePassword1783331300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN mustChangePassword tinyint(1) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN mustChangePassword
    `);
  }
}

