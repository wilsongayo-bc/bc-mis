import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreaseCourseSectionNameLength1783310000000 implements MigrationInterface {
  name = 'IncreaseCourseSectionNameLength1783310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE course_sections
      MODIFY COLUMN sectionName varchar(50) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE course_sections
      MODIFY COLUMN sectionName varchar(10) NOT NULL
    `);
  }
}

