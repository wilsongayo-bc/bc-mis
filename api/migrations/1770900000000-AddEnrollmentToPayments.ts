import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnrollmentToPayments1770900000000 implements MigrationInterface {
  name = 'AddEnrollmentToPayments1770900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
      ADD COLUMN enrollmentId varchar(36) NULL AFTER studentId
    `);

    await queryRunner.query(`
      CREATE INDEX IDX_payments_enrollmentId ON payments(enrollmentId)
    `);

    await queryRunner.query(`
      ALTER TABLE payments
      ADD CONSTRAINT FK_payments_enrollment
      FOREIGN KEY (enrollmentId) REFERENCES enrollments(id)
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
      DROP FOREIGN KEY FK_payments_enrollment
    `);

    await queryRunner.query(`
      DROP INDEX IDX_payments_enrollmentId ON payments
    `);

    await queryRunner.query(`
      ALTER TABLE payments
      DROP COLUMN enrollmentId
    `);
  }
}

