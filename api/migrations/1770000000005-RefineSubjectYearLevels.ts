import { MigrationInterface, QueryRunner } from "typeorm";

export class RefineSubjectYearLevels1770000000005 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Fetch all subjects
        const subjects = await queryRunner.query("SELECT id, code, name FROM subjects");

        for (const subject of subjects) {
            let yearLevel = 1; // Default
            const code = subject.code.toUpperCase();

            // --- 1. Specific Prefix/Keyword Overrides ---
            if (code.includes("CAPSTONE") || code.includes("CAP ") || code.startsWith("RES") || code.includes("THESIS") || code.includes("PRACTICUM") || code.includes("SIT") || code.startsWith("FS ")) {
                yearLevel = 4;
            } else if (code.startsWith("IPT")) {
                yearLevel = 3;
            } else if (code.startsWith("HCI")) {
                yearLevel = 3; // Based on Prereq
            } else if (code.includes("PATHFIT 3") || code.includes("PATHFIT 4")) {
                yearLevel = 2;
            } else if (code.includes("PATHFIT 1") || code.includes("PATHFIT 2") || code.includes("NSTP")) {
                yearLevel = 1;
            } else {
                // --- 2. Number Based Heuristics ---
                // Match the numeric part at the end or middle: e.g. "CC 103", "TE-PC 201"
                const matches = code.match(/(\d{3})/); 
                if (matches && matches[1]) {
                    const num = parseInt(matches[1]);
                    
                    // Logic for 100-series (Common in this curriculum for IS/CS/CC)
                    // 100, 101, 102 -> Year 1
                    // 103, 104 -> Year 2
                    // 105, 106 -> Year 3
                    // 107, 108, 109 -> Year 4
                    if (num >= 100 && num <= 199) {
                        if (num <= 102) yearLevel = 1;
                        else if (num <= 104) yearLevel = 2;
                        else if (num <= 106) yearLevel = 3;
                        else yearLevel = 4;
                    }
                    // Logic for 200-series (e.g. TE-PC 201) -> Year 2
                    else if (num >= 200 && num <= 299) {
                        yearLevel = 2;
                    }
                    // Logic for 300-series -> Year 3
                    else if (num >= 300 && num <= 399) {
                        yearLevel = 3;
                    }
                    // Logic for 400-series -> Year 4
                    else if (num >= 400 && num <= 499) {
                        yearLevel = 4;
                    }
                }
            }

            // Update the subject
            await queryRunner.query(
                "UPDATE subjects SET yearLevel = ? WHERE id = ?",
                [yearLevel, subject.id]
            );
        }
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // No easy revert as we don't know previous state per row, 
        // but we can set all back to 1 or NULL if needed. 
        // For now, leaving as is since this is a refinement.
    }
}
