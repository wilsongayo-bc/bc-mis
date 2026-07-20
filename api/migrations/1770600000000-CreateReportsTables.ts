import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class CreateReportsTables1770600000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const ensureIndex = async (tableName: string, index: TableIndex) => {
            const table = await queryRunner.getTable(tableName);
            const exists = (table?.indices || []).some(i => i.name === index.name);
            if (!exists) {
                await queryRunner.createIndex(tableName, index);
            }
        };

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS report_templates (
                id VARCHAR(36) PRIMARY KEY,
                created_by VARCHAR(36) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                configuration JSON NOT NULL,
                is_public BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_report_templates_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await ensureIndex("report_templates", new TableIndex({
            name: "idx_report_templates_created_by",
            columnNames: ["created_by"]
        }));
        await ensureIndex("report_templates", new TableIndex({
            name: "idx_report_templates_public",
            columnNames: ["is_public"]
        }));
        await ensureIndex("report_templates", new TableIndex({
            name: "idx_report_templates_name",
            columnNames: ["name"]
        }));

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS scheduled_reports (
                id VARCHAR(36) PRIMARY KEY,
                template_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                name VARCHAR(255) NOT NULL,
                schedule VARCHAR(100) NOT NULL,
                recipients JSON,
                is_active BOOLEAN DEFAULT TRUE,
                last_run TIMESTAMP NULL,
                next_run TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_scheduled_reports_template FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE CASCADE,
                CONSTRAINT fk_scheduled_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await ensureIndex("scheduled_reports", new TableIndex({
            name: "idx_scheduled_reports_template",
            columnNames: ["template_id"]
        }));
        await ensureIndex("scheduled_reports", new TableIndex({
            name: "idx_scheduled_reports_user",
            columnNames: ["user_id"]
        }));
        await ensureIndex("scheduled_reports", new TableIndex({
            name: "idx_scheduled_reports_active",
            columnNames: ["is_active"]
        }));

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS report_cache (
                id VARCHAR(36) PRIMARY KEY,
                cache_key VARCHAR(255) NOT NULL,
                report_type VARCHAR(100) NOT NULL,
                filters JSON,
                data JSON NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_report_cache_key UNIQUE (cache_key)
            )
        `);

        await ensureIndex("report_cache", new TableIndex({
            name: "idx_cache_expires",
            columnNames: ["expires_at"]
        }));
        await ensureIndex("report_cache", new TableIndex({
            name: "idx_cache_type",
            columnNames: ["report_type"]
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("report_cache");
        await queryRunner.dropTable("scheduled_reports");
        await queryRunner.dropTable("report_templates");
    }
}
