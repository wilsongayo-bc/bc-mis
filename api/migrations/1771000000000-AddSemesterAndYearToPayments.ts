import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSemesterAndYearToPayments1771000000000 implements MigrationInterface {
  name = 'AddSemesterAndYearToPayments1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
      ADD COLUMN semester varchar(20) NULL AFTER dueDate
    `);

    await queryRunner.query(`
      ALTER TABLE payments
      ADD COLUMN year int NULL AFTER semester
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
      DROP COLUMN year
    `);

    await queryRunner.query(`
      ALTER TABLE payments
      DROP COLUMN semester
    `);
  }
}

