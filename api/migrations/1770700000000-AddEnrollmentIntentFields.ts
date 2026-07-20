import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnrollmentIntentFields1770700000000 implements MigrationInterface {
  name = 'AddEnrollmentIntentFields1770700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE enrollments
      MODIFY COLUMN courseSectionId varchar(36) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD COLUMN academicYear varchar(10) NULL AFTER courseSectionId
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD COLUMN semester varchar(20) NULL AFTER academicYear
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD COLUMN totalAssessed decimal(10,2) NOT NULL DEFAULT 0 AFTER enrollmentDate
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD COLUMN totalPaid decimal(10,2) NOT NULL DEFAULT 0 AFTER totalAssessed
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD COLUMN balance decimal(10,2) NOT NULL DEFAULT 0 AFTER totalPaid
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD COLUMN downpaymentRequired decimal(10,2) NOT NULL DEFAULT 0 AFTER balance
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD COLUMN assessmentDetails JSON NULL AFTER downpaymentRequired
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE enrollments
      DROP COLUMN assessmentDetails
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      DROP COLUMN downpaymentRequired
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      DROP COLUMN balance
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      DROP COLUMN totalPaid
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      DROP COLUMN totalAssessed
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      DROP COLUMN semester
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      DROP COLUMN academicYear
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      MODIFY COLUMN courseSectionId varchar(36) NOT NULL
    `);
  }
}
