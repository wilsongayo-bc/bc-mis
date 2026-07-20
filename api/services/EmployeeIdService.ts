import type { QueryRunner } from 'typeorm';

export class EmployeeIdService {
  static readonly EMPLOYEE_ID_CODE = 'E';

  private static async getMaxExistingSequenceForYear(params: { queryRunner: QueryRunner; year: number }): Promise<number> {
    const { queryRunner, year } = params;
    const fullYear = String(year);

    const rows: Array<{ maxSeq: number | string | null }> = await queryRunner.query(
      `
      SELECT MAX(CAST(SUBSTRING_INDEX(employeeId, '-', -1) AS UNSIGNED)) AS maxSeq
      FROM employees
      WHERE employeeId IS NOT NULL
        AND (
          employeeId REGEXP '^[0-9]{4}-E-[0-9]{5}$'
          OR employeeId REGEXP '^[0-9]{4}-00-[0-9]{5}$'
          OR employeeId REGEXP '^[0-9]{4}-[0-9]{5}$'
        )
        AND SUBSTRING_INDEX(employeeId, '-', 1) = ?
      `,
      [fullYear]
    );

    return Number(rows?.[0]?.maxSeq ?? 0);
  }

  static async allocateEmployeeId(params: { queryRunner: QueryRunner; year?: number }): Promise<string> {
    const { queryRunner } = params;
    const year = params.year ?? new Date().getFullYear();
    const fullYear = String(year);

    const maxExistingSequence = await EmployeeIdService.getMaxExistingSequenceForYear({ queryRunner, year });

    await queryRunner.query(
      `
      INSERT INTO employee_id_sequences (year, id_code, current_value)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE current_value = GREATEST(current_value, VALUES(current_value))
      `,
      [year, EmployeeIdService.EMPLOYEE_ID_CODE, maxExistingSequence]
    );

    await queryRunner.query(
      `
      UPDATE employee_id_sequences
      SET current_value = LAST_INSERT_ID(current_value + 1)
      WHERE year = ? AND id_code = ?
      `,
      [year, EmployeeIdService.EMPLOYEE_ID_CODE]
    );

    const nextSequenceRows: Array<{ nextSequence: number | string }> = await queryRunner.query(
      `SELECT LAST_INSERT_ID() AS nextSequence`
    );
    const nextSequence = Number(nextSequenceRows?.[0]?.nextSequence);
    if (!Number.isFinite(nextSequence) || nextSequence <= 0) {
      throw new Error('Failed to allocate Employee ID sequence');
    }

    const formattedSequence = String(nextSequence).padStart(5, '0');
    return `${fullYear}-E-${formattedSequence}`;
  }
}
