import { MigrationInterface, QueryRunner } from 'typeorm';

const TEN_MB_IN_BYTES = 10 * 1024 * 1024;

export class IncreaseDocumentRequirementFileSizeLimit1774400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE document_requirements
      SET validation_rules = JSON_SET(
            COALESCE(validation_rules, JSON_OBJECT()),
            '$.maxFileSize',
            ?
          ),
          updated_at = NOW()
      WHERE validation_rules IS NOT NULL
        AND JSON_EXTRACT(validation_rules, '$.maxFileSize') IS NOT NULL
        AND CAST(JSON_UNQUOTE(JSON_EXTRACT(validation_rules, '$.maxFileSize')) AS UNSIGNED) < ?
      `,
      [TEN_MB_IN_BYTES, TEN_MB_IN_BYTES]
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible data update: previous per-requirement sizes are not preserved.
  }
}
