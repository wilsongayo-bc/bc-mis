import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateActivityLogsTable1765091165000 implements MigrationInterface {
  name = 'CreateActivityLogsTable1765091165000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'activity_logs',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'role', type: 'varchar', length: '20' },
          { name: 'action', type: 'varchar', length: '255' },
          { name: 'method', type: 'varchar', length: '10' },
          { name: 'endpoint', type: 'varchar', length: '255' },
          { name: 'params', type: 'text', isNullable: true },
          { name: 'statusCode', type: 'int' },
          { name: 'ip', type: 'varchar', length: '45', isNullable: true },
          { name: 'userAgent', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' }
        ]
      }),
      true
    );

    await queryRunner.createIndex('activity_logs', new TableIndex({
      name: 'IDX_ACTIVITY_LOGS_CREATED_AT',
      columnNames: ['createdAt']
    }));

    await queryRunner.createIndex('activity_logs', new TableIndex({
      name: 'IDX_ACTIVITY_LOGS_USERID',
      columnNames: ['userId']
    }));

    await queryRunner.createIndex('activity_logs', new TableIndex({
      name: 'IDX_ACTIVITY_LOGS_METHOD',
      columnNames: ['method']
    }));

    await queryRunner.createIndex('activity_logs', new TableIndex({
      name: 'IDX_ACTIVITY_LOGS_ENDPOINT',
      columnNames: ['endpoint']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('activity_logs', 'IDX_ACTIVITY_LOGS_ENDPOINT');
    await queryRunner.dropIndex('activity_logs', 'IDX_ACTIVITY_LOGS_METHOD');
    await queryRunner.dropIndex('activity_logs', 'IDX_ACTIVITY_LOGS_USERID');
    await queryRunner.dropIndex('activity_logs', 'IDX_ACTIVITY_LOGS_CREATED_AT');
    await queryRunner.dropTable('activity_logs');
  }
}

