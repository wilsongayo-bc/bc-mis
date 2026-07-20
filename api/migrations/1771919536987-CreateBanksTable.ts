import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBanksTable1771919536987 implements MigrationInterface {
    name = 'CreateBanksTable1771919536987'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`banks\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(100) NOT NULL, \`code\` varchar(50) NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_bc680de8ba9d7878fddcecd610\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_bc680de8ba9d7878fddcecd610\` ON \`banks\``);
        await queryRunner.query(`DROP TABLE \`banks\``);
    }

}
