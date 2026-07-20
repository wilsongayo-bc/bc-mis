import type { QueryRunner } from 'typeorm';
import { Course } from '../entities/Course';

export class StudentIdService {
  private static readonly GLOBAL_SEQUENCE_ID_CODE = 'ZZ';

  private static async getMaxExistingSequenceForYear(params: {
    queryRunner: QueryRunner;
    fullYear: string;
    legacyShortYear: string;
  }): Promise<number> {
    const { queryRunner, fullYear, legacyShortYear } = params;

    const maxExistingRows: Array<{ maxSeq: number | string | null }> = await queryRunner.query(
      `
      SELECT MAX(CAST(SUBSTRING_INDEX(studentId, '-', -1) AS UNSIGNED)) AS maxSeq
      FROM students
      WHERE studentId IS NOT NULL
        AND (
          (studentId REGEXP '^[0-9]{4}-[A-Za-z0-9]{2}-[0-9]{3,5}$'
            AND SUBSTRING_INDEX(studentId, '-', 1) = ?)
          OR
          (studentId REGEXP '^[0-9]{2}-[A-Za-z0-9]{2}-[0-9]{3,5}$'
            AND SUBSTRING_INDEX(studentId, '-', 1) = ?)
          OR
          (studentId REGEXP '^[0-9]{4}-[0-9]{3,5}$'
            AND SUBSTRING_INDEX(studentId, '-', 1) = ?)
        )
      `,
      [fullYear, legacyShortYear, fullYear]
    );

    return Number(maxExistingRows?.[0]?.maxSeq ?? 0);
  }

  static async previewStudentId(params: { queryRunner: QueryRunner; courseId: string; year?: number }): Promise<string> {
    const { queryRunner, courseId } = params;
    const year = params.year ?? new Date().getFullYear();
    const fullYear = String(year);
    const legacyShortYear = fullYear.slice(-2);

    const course = await queryRunner.manager.findOne(Course, { where: { id: courseId } });
    if (!course) throw new Error('Course not found');
    if (!course.idCode) throw new Error('Course is missing ID Code');

    const idCode = course.idCode;
    if (idCode.length !== 2) throw new Error('Course ID Code must be 2 characters');

    const maxExistingSequence = await StudentIdService.getMaxExistingSequenceForYear({
      queryRunner,
      fullYear,
      legacyShortYear
    });

    const existingSequenceRows: Array<{ current_value: number | string }> = await queryRunner.query(
      `SELECT current_value FROM student_id_sequences WHERE year = ? AND id_code = ? LIMIT 1`,
      [year, StudentIdService.GLOBAL_SEQUENCE_ID_CODE]
    );
    const currentValue = Number(existingSequenceRows?.[0]?.current_value ?? 0);

    const nextSequence = Math.max(currentValue, maxExistingSequence) + 1;
    const formattedSequence = String(nextSequence).padStart(5, '0');
    return `${fullYear}-${formattedSequence}`;
  }

  static async allocateStudentId(params: { queryRunner: QueryRunner; courseId: string; year?: number }): Promise<string> {
    const { queryRunner, courseId } = params;
    const year = params.year ?? new Date().getFullYear();
    const fullYear = String(year);
    const legacyShortYear = fullYear.slice(-2);

    const course = await queryRunner.manager.findOne(Course, { where: { id: courseId } });
    if (!course) throw new Error('Course not found');
    if (!course.idCode) throw new Error('Course is missing ID Code');

    const idCode = course.idCode;
    if (idCode.length !== 2) throw new Error('Course ID Code must be 2 characters');

    const maxExistingSequence = await StudentIdService.getMaxExistingSequenceForYear({
      queryRunner,
      fullYear,
      legacyShortYear
    });

    await queryRunner.query(
      `
      INSERT INTO student_id_sequences (year, id_code, current_value)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE current_value = GREATEST(current_value, VALUES(current_value))
      `,
      [year, StudentIdService.GLOBAL_SEQUENCE_ID_CODE, maxExistingSequence]
    );

    await queryRunner.query(
      `
      UPDATE student_id_sequences
      SET current_value = LAST_INSERT_ID(current_value + 1)
      WHERE year = ? AND id_code = ?
      `,
      [year, StudentIdService.GLOBAL_SEQUENCE_ID_CODE]
    );

    const nextSequenceRows: Array<{ nextSequence: number | string }> = await queryRunner.query(
      `SELECT LAST_INSERT_ID() AS nextSequence`
    );
    const nextSequence = Number(nextSequenceRows?.[0]?.nextSequence);
    if (!Number.isFinite(nextSequence) || nextSequence <= 0) {
      throw new Error('Failed to allocate Student ID sequence');
    }

    console.log('🔢 Student ID Generation:', {
      courseId,
      idCode,
      sequenceIdCode: StudentIdService.GLOBAL_SEQUENCE_ID_CODE,
      year,
      fullYear,
      legacyShortYear,
      maxExistingSequence,
      nextSequence
    });

    // Format with 5-digit padding (00001, 00002, etc.)
    const formattedSequence = String(nextSequence).padStart(5, '0');
    return `${fullYear}-${formattedSequence}`;
  }
}
