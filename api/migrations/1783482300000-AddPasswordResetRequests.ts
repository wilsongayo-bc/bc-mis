import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetRequests1783482300000 implements MigrationInterface {
  name = 'AddPasswordResetRequests1783482300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`password_reset_requests\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`tokenHash\` varchar(64) NOT NULL,
        \`codeHash\` varchar(64) NOT NULL,
        \`expiresAt\` datetime NOT NULL,
        \`usedAt\` datetime NULL,
        \`attemptCount\` int NOT NULL DEFAULT 0,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_password_reset_tokenHash\` (\`tokenHash\`),
        INDEX \`IDX_password_reset_user_used\` (\`userId\`, \`usedAt\`),
        INDEX \`IDX_password_reset_expiresAt\` (\`expiresAt\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_password_reset_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`password_reset_requests\``);
  }
}

