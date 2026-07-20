import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedSubjectCourseAndYear1770000000003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Get BSIS Course ID
        const bsisCourse = await queryRunner.query(`
            SELECT id FROM courses WHERE courseCode = 'BSIS' LIMIT 1
        `);

        // 2. Get BSIT Course ID (fallback or additional)
        const bsitCourse = await queryRunner.query(`
            SELECT id FROM courses WHERE courseCode = 'BSIT' LIMIT 1
        `);

        const targetCourseId = bsisCourse.length > 0 ? bsisCourse[0].id : (bsitCourse.length > 0 ? bsitCourse[0].id : null);

        if (targetCourseId) {
            // 3. Update sample subjects to belong to this course and First Year (1)
            // We'll update CS101, CS102, MATH101 which were seeded earlier
            await queryRunner.query(`
                UPDATE subjects 
                SET courseId = ?, yearLevel = 1
                WHERE code IN ('CS101', 'CS102', 'MATH101')
            `, [targetCourseId]);

            // Also update any other subjects that have null courseId to this course/year 1 as a fallback for testing
            // checking if there are other subjects
            await queryRunner.query(`
                UPDATE subjects 
                SET courseId = ?, yearLevel = 1
                WHERE courseId IS NULL AND departmentId IN (SELECT id FROM departments WHERE code = 'CS')
            `, [targetCourseId]);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes - set courseId and yearLevel back to NULL for these subjects
        await queryRunner.query(`
            UPDATE subjects 
            SET courseId = NULL, yearLevel = NULL
            WHERE code IN ('CS101', 'CS102', 'MATH101')
        `);
    }
}
