import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddPreRegistrationFields1704067200000 implements MigrationInterface {
    name = 'AddPreRegistrationFields1704067200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasTable('students'))) return;

        if (!(await queryRunner.hasColumn('students', 'temporaryId'))) {
            await queryRunner.addColumn("students", new TableColumn({
                name: "temporaryId",
                type: "varchar",
                length: "20",
                isNullable: true,
                isUnique: true
            }));
        }

        if (!(await queryRunner.hasColumn('students', 'documentsRequired'))) {
            await queryRunner.addColumn("students", new TableColumn({
                name: "documentsRequired",
                type: "json",
                isNullable: true
            }));
        }

        if (!(await queryRunner.hasColumn('students', 'documentsSubmitted'))) {
            await queryRunner.addColumn("students", new TableColumn({
                name: "documentsSubmitted",
                type: "json",
                isNullable: true
            }));
        }

        if (!(await queryRunner.hasColumn('students', 'registration_notes'))) {
            await queryRunner.addColumn("students", new TableColumn({
                name: "registration_notes",
                type: "text",
                isNullable: true
            }));
        }

        if (!(await queryRunner.hasColumn('students', 'verification_date'))) {
            await queryRunner.addColumn("students", new TableColumn({
                name: "verification_date",
                type: "date",
                isNullable: true
            }));
        }

        if (await queryRunner.hasColumn('students', 'registrationStatus')) {
            await queryRunner.query(`
                UPDATE students 
                SET registrationStatus = 'REGISTERED' 
                WHERE registrationStatus = 'ENROLLED'
            `);

            const columnInfo = await queryRunner.query(`
                SELECT COLUMN_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'students' 
                AND COLUMN_NAME = 'registrationStatus'
            `);

            const columnType = columnInfo?.[0]?.COLUMN_TYPE;
            if (
                typeof columnType === 'string' &&
                columnType.includes("enum(") &&
                columnType.includes("'ENROLLED'") &&
                !columnType.includes("'FOR_ENROLLMENT'") &&
                !columnType.includes("'FOR_SCHEDULING'")
            ) {
                await queryRunner.query(`
                    ALTER TABLE students 
                    MODIFY COLUMN registrationStatus ENUM('PRE_REGISTERED', 'VERIFIED', 'REGISTERED') 
                    DEFAULT 'PRE_REGISTERED'
                `);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasTable('students'))) return;

        if (await queryRunner.hasColumn('students', 'temporaryId')) {
            await queryRunner.dropColumn("students", "temporaryId");
        }
        if (await queryRunner.hasColumn('students', 'documentsRequired')) {
            await queryRunner.dropColumn("students", "documentsRequired");
        }
        if (await queryRunner.hasColumn('students', 'documentsSubmitted')) {
            await queryRunner.dropColumn("students", "documentsSubmitted");
        }
        if (await queryRunner.hasColumn('students', 'registration_notes')) {
            await queryRunner.dropColumn("students", "registration_notes");
        }
        if (await queryRunner.hasColumn('students', 'verification_date')) {
            await queryRunner.dropColumn("students", "verification_date");
        }

        if (await queryRunner.hasColumn('students', 'registrationStatus')) {
            await queryRunner.query(`
                UPDATE students 
                SET registrationStatus = 'ENROLLED' 
                WHERE registrationStatus = 'REGISTERED'
            `);

            const columnInfo = await queryRunner.query(`
                SELECT COLUMN_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'students' 
                AND COLUMN_NAME = 'registrationStatus'
            `);

            const columnType = columnInfo?.[0]?.COLUMN_TYPE;
            if (
                typeof columnType === 'string' &&
                columnType.includes("enum(") &&
                columnType.includes("'REGISTERED'") &&
                !columnType.includes("'FOR_ENROLLMENT'") &&
                !columnType.includes("'FOR_SCHEDULING'")
            ) {
                await queryRunner.query(`
                    ALTER TABLE students 
                    MODIFY COLUMN registrationStatus ENUM('PRE_REGISTERED', 'VERIFIED', 'ENROLLED') 
                    DEFAULT 'PRE_REGISTERED'
                `);
            }
        }
    }
}