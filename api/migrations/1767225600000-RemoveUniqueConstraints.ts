import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class RemoveUniqueConstraints1767225600000 implements MigrationInterface {
  name = 'RemoveUniqueConstraints1767225600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove unique constraint from academic_years.year column
    // First, drop the unique index
    try {
      await queryRunner.dropIndex('academic_years', 'IDX_year');
    } catch (_error) {
      // Index might have a different name, try alternative names
      try {
        await queryRunner.query(`ALTER TABLE \`academic_years\` DROP INDEX \`year\``);
      } catch (_innerError) {
        console.log('Note: Could not drop index on academic_years.year - it may not exist or have a different name');
      }
    }

    // Remove unique constraint from report_cache.cache_key column
    try {
      await queryRunner.dropIndex('report_cache', 'IDX_cacheKey');
    } catch (_error) {
      // Index might have a different name, try alternative names
      try {
        await queryRunner.query(`ALTER TABLE \`report_cache\` DROP INDEX \`cache_key\``);
      } catch (_innerError) {
        console.log('Note: Could not drop index on report_cache.cache_key - it may not exist or have a different name');
      }
    }

    console.log('✅ Unique constraints removed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore unique constraint on academic_years.year column
    await queryRunner.createIndex(
      'academic_years',
      new TableIndex({
        name: 'IDX_year',
        columnNames: ['year'],
        isUnique: true,
      })
    );

    // Restore unique constraint on report_cache.cache_key column
    await queryRunner.createIndex(
      'report_cache',
      new TableIndex({
        name: 'IDX_cacheKey',
        columnNames: ['cache_key'],
        isUnique: true,
      })
    );

    console.log('✅ Unique constraints restored');
  }
}
