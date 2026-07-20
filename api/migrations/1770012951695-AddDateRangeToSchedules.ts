import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDateRangeToSchedules1770012951695 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('schedules');
        const columns = [];
        
        if (!table?.findColumnByName('startDate')) {
            columns.push(new TableColumn({
                name: "startDate",
                type: "date",
                isNullable: true,
            }));
        }
        
        if (!table?.findColumnByName('endDate')) {
            columns.push(new TableColumn({
                name: "endDate",
                type: "date",
                isNullable: true,
            }));
        }
        
        if (columns.length > 0) {
            await queryRunner.addColumns("schedules", columns);
            console.log(`✅ Added ${columns.length} date columns to schedules table`);
        } else {
            console.log('Date columns already exist in schedules table');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("schedules", "endDate");
        await queryRunner.dropColumn("schedules", "startDate");
    }

}
