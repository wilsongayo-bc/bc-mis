import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerification1783474000000 implements MigrationInterface {
  name = 'AddEmailVerification1783474000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN isEmailVerified tinyint(1) NOT NULL DEFAULT 0,
      ADD COLUMN emailVerifiedAt datetime NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`email_verification_requests\` (
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
        UNIQUE INDEX \`IDX_email_verification_tokenHash\` (\`tokenHash\`),
        INDEX \`IDX_email_verification_user_used\` (\`userId\`, \`usedAt\`),
        INDEX \`IDX_email_verification_expiresAt\` (\`expiresAt\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_email_verification_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`email_verification_requests\``);

    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN emailVerifiedAt,
      DROP COLUMN isEmailVerified
    `);
  }
}

