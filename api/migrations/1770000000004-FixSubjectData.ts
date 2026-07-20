import { MigrationInterface, QueryRunner } from "typeorm";

export class FixSubjectData1770000000004 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Get Course IDs
        const bsisCourse = await queryRunner.query("SELECT id FROM courses WHERE courseCode = 'BSIS' LIMIT 1");
        const btvtedCourse = await queryRunner.query("SELECT id FROM courses WHERE courseCode = 'BTVTED' LIMIT 1"); // Assuming BTVTED code exists
        
        const bsisId = bsisCourse.length > 0 ? bsisCourse[0].id : null;
        const btvtedId = btvtedCourse.length > 0 ? btvtedCourse[0].id : null;

        // 2. Fetch all subjects
        const subjects = await queryRunner.query("SELECT id, code, name FROM subjects");

        for (const subject of subjects) {
            let yearLevel = 1; // Default
            let courseId = null; // Default to shared/GE

            const code = subject.code.toUpperCase();

            // --- Determine Year Level ---
            // Pattern: Any letters followed by space or hyphen, then a digit (1-4)
            // Examples: "CS 101" -> 1, "CS101" -> 1, "TE-PC 201" -> 2
            
            const matches = code.match(/(\d)\d\d/); // Looks for 3 digits
            if (matches && matches[1]) {
                const digit = parseInt(matches[1]);
                if (digit >= 1 && digit <= 4) {
                    yearLevel = digit;
                }
            } else {
                // Special cases
                if (code.includes("PATHFIT 1") || code.includes("PATHFIT 2") || code.includes("NSTP 1") || code.includes("NSTP 2")) yearLevel = 1;
                else if (code.includes("PATHFIT 3") || code.includes("PATHFIT 4")) yearLevel = 2;
                else if (code.includes("FS 01") || code.includes("FS 02")) yearLevel = 4; // Field Study usually 4th year
                else if (code.includes("CAPSTONE") || code.includes("THESIS") || code.includes("RESEARCH")) yearLevel = 4; // Research/Capstone usually 3rd/4th
            }

            // --- Determine Course ---
            // BSIS subjects: IS, CS, IT, CC, DIT
            if (code.startsWith("IS") || code.startsWith("CS") || code.startsWith("IT") || code.startsWith("CC") || code.startsWith("DIT") || code.startsWith("HCI") || code.startsWith("CAP") || code.startsWith("IPT")) {
                courseId = bsisId;
            }
            // BTVTED subjects: TE, TV, TLE, EDUC
            else if (code.startsWith("TE") || code.startsWith("TV") || code.startsWith("TLE") || code.startsWith("EDUC")) {
                courseId = btvtedId;
            }
            // GE/Common subjects remain null (GE, MATH, ENG, FIL, PE, NSTP, RIZAL)

            // Update the subject
            await queryRunner.query(
                "UPDATE subjects SET yearLevel = ?, courseId = ? WHERE id = ?",
                [yearLevel, courseId, subject.id]
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reset to nullable/defaults
        await queryRunner.query("UPDATE subjects SET yearLevel = NULL, courseId = NULL");
    }
}
