import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeStudentFieldsNullable1704067200000 implements MigrationInterface {
    name = 'MakeStudentFieldsNullable1704067200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if columns exist before modifying
        const studentsTable = await queryRunner.getTable('students');
        
        // Make optional student fields nullable (non-FK columns first)
        if (studentsTable?.findColumnByName('phoneNumber')) {
            await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`phoneNumber\` varchar(20) NULL`);
        }
        if (studentsTable?.findColumnByName('guardian_name')) {
            await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`guardian_name\` varchar(200) NULL`);
        }
        if (studentsTable?.findColumnByName('guardian_phone')) {
            await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`guardian_phone\` varchar(20) NULL`);
        }
        if (studentsTable?.findColumnByName('guardian_email')) {
            await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`guardian_email\` varchar(255) NULL`);
        }
        if (studentsTable?.findColumnByName('emergencyContact')) {
            await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`emergencyContact\` varchar(100) NULL`);
        }
        if (studentsTable?.findColumnByName('emergencyPhone')) {
            await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`emergencyPhone\` varchar(20) NULL`);
        }
        if (studentsTable?.findColumnByName('medical_info')) {
            await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`medical_info\` text NULL`);
        }
        if (studentsTable?.findColumnByName('graduation_date')) {
            await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`graduation_date\` date NULL`);
        }
        if (studentsTable?.findColumnByName('enrollmentDate')) {
            await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`enrollmentDate\` date NULL`);
        }
        
        // Handle grade_level_id separately (has FK constraint)
        if (studentsTable?.findColumnByName('grade_level_id')) {
            // Find and drop the foreign key constraint first
            const foreignKey = studentsTable.foreignKeys.find(fk => 
                fk.columnNames.includes('grade_level_id')
            );
            
            if (foreignKey) {
                await queryRunner.dropForeignKey('students', foreignKey);
                console.log('Dropped FK constraint on grade_level_id');
            }
            
            // Now modify the column
            await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`grade_level_id\` varchar(36) NULL`);
            
            // Recreate the foreign key constraint
            if (foreignKey) {
                await queryRunner.query(`
                    ALTER TABLE \`students\` 
                    ADD CONSTRAINT \`FK_students_grade_level\` 
                    FOREIGN KEY (\`grade_level_id\`) 
                    REFERENCES \`grade_levels\`(\`id\`) 
                    ON DELETE SET NULL 
                    ON UPDATE NO ACTION
                `);
                console.log('Recreated FK constraint on grade_level_id');
            }
        }
        
        console.log('✅ Made student fields nullable');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert nullable fields back to NOT NULL (only if safe to do so)
        await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`phoneNumber\` varchar(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`guardian_name\` varchar(200) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`guardian_phone\` varchar(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`guardian_email\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`emergencyContact\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`emergencyPhone\` varchar(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`grade_level_id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`medical_info\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`graduation_date\` date NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`students\` MODIFY COLUMN \`enrollmentDate\` date NOT NULL`);
    }
}