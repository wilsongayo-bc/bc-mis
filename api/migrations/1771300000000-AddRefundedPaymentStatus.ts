import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefundedPaymentStatus1771300000000 implements MigrationInterface {
  name = 'AddRefundedPaymentStatus1771300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
      MODIFY COLUMN status ENUM('PENDING','PAID','OVERDUE','CANCELLED','REFUNDED') NOT NULL DEFAULT 'PENDING'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
      MODIFY COLUMN status ENUM('PENDING','PAID','OVERDUE','CANCELLED') NOT NULL DEFAULT 'PENDING'
    `);
  }
}

