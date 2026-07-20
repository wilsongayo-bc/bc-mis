import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDatesToAcademicYear1770550000000 implements MigrationInterface {
  name = 'AddDatesToAcademicYear1770550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('academic_years');
    if (!table) return;

    if (!table.findColumnByName('startDate')) {
        await queryRunner.addColumn('academic_years', new TableColumn({
            name: 'startDate',
            type: 'date',
            isNullable: true,
            comment: 'Start date of the academic year'
        }));
    }

    if (!table.findColumnByName('endDate')) {
        await queryRunner.addColumn('academic_years', new TableColumn({
            name: 'endDate',
            type: 'date',
            isNullable: true,
            comment: 'End date of the academic year'
        }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('academic_years', 'endDate');
    await queryRunner.dropColumn('academic_years', 'startDate');
  }
}
