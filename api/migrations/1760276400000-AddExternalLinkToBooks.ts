import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddExternalLinkToBooks1760276400000 implements MigrationInterface {
  name = 'AddExternalLinkToBooks1760276400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'books',
      new TableColumn({
        name: 'externalLink',
        type: 'varchar',
        length: '500',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('books', 'externalLink');
  }
}