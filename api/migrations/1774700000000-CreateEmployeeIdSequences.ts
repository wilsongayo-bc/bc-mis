import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmployeeIdSequences1774700000000 implements MigrationInterface {
  name = 'CreateEmployeeIdSequences1774700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employee_id_sequences (
        year INT NOT NULL,
        id_code VARCHAR(2) NOT NULL,
        current_value INT NOT NULL DEFAULT 0,
        PRIMARY KEY (year, id_code)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS employee_id_sequences
    `);
  }
}
