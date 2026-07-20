import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseAssessmentFields1770800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE courses
      ADD COLUMN tuitionPerUnit DECIMAL(10,2) NULL,
      ADD COLUMN miscellaneousFee DECIMAL(10,2) NULL,
      ADD COLUMN downpaymentRate DECIMAL(5,4) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE courses
      DROP COLUMN tuitionPerUnit,
      DROP COLUMN miscellaneousFee,
      DROP COLUMN downpaymentRate
    `);
  }
}
