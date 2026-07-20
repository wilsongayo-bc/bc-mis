import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRolesColumn1784010000000 implements MigrationInterface {
  name = 'AddUserRolesColumn1784010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN roles text NULL
    `);

    await queryRunner.query(`
      UPDATE users
      SET roles = JSON_ARRAY(role)
      WHERE roles IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN roles
    `);
  }
}

