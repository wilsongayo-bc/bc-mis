import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEmployeeIdFormat1783932000000 implements MigrationInterface {
  name = 'UpdateEmployeeIdFormat1783932000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Convert existing employeeId format from YYYY-00-SEQUENCE to YYYY-SEQUENCE
    // Only target those that match the old pattern (e.g., 2026-00-00003)
    await queryRunner.query(`
      UPDATE employees
      SET employeeId = CONCAT(SUBSTRING_INDEX(employeeId, '-', 1), '-', SUBSTRING_INDEX(employeeId, '-', -1))
      WHERE employeeId REGEXP '^[0-9]{4}-00-[0-9]{5}$'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert employeeId format from YYYY-SEQUENCE to YYYY-00-SEQUENCE
    // Only target those that match the new pattern (e.g., 2026-00003)
    await queryRunner.query(`
      UPDATE employees
      SET employeeId = CONCAT(SUBSTRING_INDEX(employeeId, '-', 1), '-00-', SUBSTRING_INDEX(employeeId, '-', -1))
      WHERE employeeId REGEXP '^[0-9]{4}-[0-9]{5}$'
    `);
  }
}
