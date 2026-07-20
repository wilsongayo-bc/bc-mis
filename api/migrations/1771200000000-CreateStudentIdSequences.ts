import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentIdSequences1771200000000 implements MigrationInterface {
  name = 'CreateStudentIdSequences1771200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS student_id_sequences (
        year INT NOT NULL,
        id_code VARCHAR(2) NOT NULL,
        current_value INT NOT NULL DEFAULT 0,
        PRIMARY KEY (year, id_code)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS student_id_sequences
    `);
  }
}
