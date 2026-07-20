import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRemarksToPayments1771200000000 implements MigrationInterface {
  name = 'AddRemarksToPayments1771200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
      ADD COLUMN remarks text NULL AFTER description
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
      DROP COLUMN remarks
    `);
  }
}

