import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddMissingUserColumns1758590900000 implements MigrationInterface {
    name = 'AddMissingUserColumns1758590900000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const usersTableBefore = await queryRunner.getTable('users');
        if (!usersTableBefore) return;

        if (!usersTableBefore.findColumnByName('middleInitial')) {
            await queryRunner.addColumn('users', new TableColumn({
                name: 'middleInitial',
                type: 'varchar',
                length: '5',
                isNullable: true
            }));
        }

        if (!usersTableBefore.findColumnByName('username')) {
            await queryRunner.addColumn('users', new TableColumn({
                name: 'username',
                type: 'varchar',
                length: '50',
                isNullable: true
            }));

            await queryRunner.query("UPDATE `users` SET `username` = `id` WHERE `username` IS NULL OR `username` = ''");
            await queryRunner.query("ALTER TABLE `users` MODIFY COLUMN `username` varchar(50) NOT NULL");
        }

        if (!usersTableBefore.findColumnByName('position')) {
            await queryRunner.addColumn('users', new TableColumn({
                name: 'position',
                type: 'varchar',
                length: '100',
                isNullable: true
            }));

            await queryRunner.query("UPDATE `users` SET `position` = 'Staff' WHERE `position` IS NULL OR `position` = ''");
            await queryRunner.query("ALTER TABLE `users` MODIFY COLUMN `position` varchar(100) NOT NULL");
        }

        const usersTableAfter = await queryRunner.getTable('users');
        if (!usersTableAfter) return;

        const usernameIndexExists = (usersTableAfter.indices || []).some(idx => idx.name === 'IDX_username');
        if (!usernameIndexExists) {
            await queryRunner.createIndex('users', new TableIndex({
                name: 'IDX_username',
                columnNames: ['username'],
                isUnique: true
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const usersTable = await queryRunner.getTable('users');
        if (!usersTable) return;

        const usernameIndexExists = (usersTable.indices || []).some(idx => idx.name === 'IDX_username');
        if (usernameIndexExists) {
            await queryRunner.dropIndex('users', 'IDX_username');
        }

        if (usersTable.findColumnByName('middleInitial')) {
            await queryRunner.dropColumn('users', 'middleInitial');
        }
        if (usersTable.findColumnByName('username')) {
            await queryRunner.dropColumn('users', 'username');
        }
        if (usersTable.findColumnByName('position')) {
            await queryRunner.dropColumn('users', 'position');
        }
    }
}