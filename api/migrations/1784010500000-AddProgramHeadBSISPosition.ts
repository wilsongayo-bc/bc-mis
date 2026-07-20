import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProgramHeadBSISPosition1784010500000 implements MigrationInterface {
  name = 'AddProgramHeadBSISPosition1784010500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT IGNORE INTO positions (id, name, description, isActive)
      VALUES (UUID(), 'Program Head, BSIS', 'Program Head for BSIS', true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM positions WHERE name = 'Program Head, BSIS'
    `);
  }
}

