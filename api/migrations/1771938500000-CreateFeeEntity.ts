import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateFeeEntity1771938500000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "fees",
            columns: [
                {
                    name: "id",
                    type: "varchar",
                    length: "36",
                    isPrimary: true,
                    generationStrategy: "uuid"
                },
                {
                    name: "name",
                    type: "varchar",
                    length: "100"
                },
                {
                    name: "description",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "amount",
                    type: "decimal",
                    precision: 10,
                    scale: 2
                },
                {
                    name: "type",
                    type: "enum",
                    enum: ["TUITION", "MISC", "LAB", "OTHER"],
                    default: "'OTHER'"
                },
                {
                    name: "isPerUnit",
                    type: "boolean",
                    default: false
                },
                {
                    name: "courseId",
                    type: "varchar",
                    length: "36",
                    isNullable: true
                },
                {
                    name: "yearLevel",
                    type: "int",
                    isNullable: true
                },
                {
                    name: "isActive",
                    type: "boolean",
                    default: true
                },
                {
                    name: "createdAt",
                    type: "datetime",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updatedAt",
                    type: "datetime",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP"
                }
            ]
        }), true);

        // Add foreign key for courseId
        await queryRunner.createForeignKey("fees", new TableForeignKey({
            columnNames: ["courseId"],
            referencedColumnNames: ["id"],
            referencedTableName: "courses",
            onDelete: "SET NULL"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("fees");
        if (table) {
            const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("courseId") !== -1);
            if (foreignKey) {
                await queryRunner.dropForeignKey("fees", foreignKey);
            }
        }
        await queryRunner.dropTable("fees");
    }
}
