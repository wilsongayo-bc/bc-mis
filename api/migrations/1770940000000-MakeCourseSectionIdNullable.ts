import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCourseSectionIdNullable1770940000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make courseSectionId nullable in enrollments table
    await queryRunner.query(`
      ALTER TABLE enrollments 
      MODIFY COLUMN courseSectionId VARCHAR(36) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert courseSectionId to NOT NULL
    await queryRunner.query(`
      ALTER TABLE enrollments 
      MODIFY COLUMN courseSectionId VARCHAR(36) NOT NULL
    `);
  }
}
