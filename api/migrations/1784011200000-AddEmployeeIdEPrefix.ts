import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeeIdEPrefix1784011200000 implements MigrationInterface {
  name = 'AddEmployeeIdEPrefix1784011200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE employees
      SET employeeId = CONCAT(SUBSTRING_INDEX(employeeId, '-', 1), '-E-', SUBSTRING_INDEX(employeeId, '-', -1))
      WHERE employeeId REGEXP '^[0-9]{4}-00-[0-9]{5}$'
    `);

    await queryRunner.query(`
      UPDATE employees
      SET employeeId = CONCAT(SUBSTRING_INDEX(employeeId, '-', 1), '-E-', SUBSTRING_INDEX(employeeId, '-', -1))
      WHERE employeeId REGEXP '^[0-9]{4}-[0-9]{5}$'
    `);

    await queryRunner.query(`
      INSERT INTO employee_id_sequences (year, id_code, current_value)
      SELECT
        CAST(SUBSTRING(employeeId, 1, 4) AS UNSIGNED) AS year,
        'E' AS id_code,
        MAX(CAST(SUBSTRING_INDEX(employeeId, '-', -1) AS UNSIGNED)) AS current_value
      FROM employees
      WHERE employeeId REGEXP '^[0-9]{4}-E-[0-9]{5}$'
      GROUP BY CAST(SUBSTRING(employeeId, 1, 4) AS UNSIGNED)
      ON DUPLICATE KEY UPDATE current_value = GREATEST(current_value, VALUES(current_value))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE employees
      SET employeeId = CONCAT(SUBSTRING_INDEX(employeeId, '-', 1), '-', SUBSTRING_INDEX(employeeId, '-', -1))
      WHERE employeeId REGEXP '^[0-9]{4}-E-[0-9]{5}$'
    `);

    await queryRunner.query(`
      DELETE FROM employee_id_sequences WHERE id_code = 'E'
    `);
  }
}

