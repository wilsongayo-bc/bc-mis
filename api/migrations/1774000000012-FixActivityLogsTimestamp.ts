import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dweezil's Code
 * Migration to ensure activity_logs table has proper timestamp handling
 * This migration ensures the createdAt column is properly configured to store UTC timestamps
 */
export class FixActivityLogsTimestamp1774000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the activity_logs table exists
    const tableExists = await queryRunner.hasTable('activity_logs');
    
    if (!tableExists) {
      console.log('activity_logs table does not exist, skipping migration');
      return;
    }

    // Ensure the createdAt column is properly configured
    // MySQL stores DATETIME as local time by default, but we want to ensure consistency
    // TypeORM's @CreateDateColumn() should handle this, but we'll verify the column exists
    const table = await queryRunner.getTable('activity_logs');
    const createdAtColumn = table?.findColumnByName('createdAt');
    
    if (!createdAtColumn) {
      // Add createdAt column if it doesn't exist
      await queryRunner.query(`
        ALTER TABLE activity_logs 
        ADD COLUMN createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      `);
      console.log('Added createdAt column to activity_logs table');
    } else {
      // Ensure the column has the correct type and default value
      await queryRunner.query(`
        ALTER TABLE activity_logs 
        MODIFY COLUMN createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      `);
      console.log('Updated createdAt column in activity_logs table');
    }

    // Add an index on createdAt for better query performance
    const hasIndex = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'activity_logs' 
      AND index_name = 'IDX_activity_logs_createdAt'
    `);
    
    const indexCount = Number(hasIndex?.[0]?.count ?? 0);
    if (indexCount === 0) {
      await queryRunner.query(`
        CREATE INDEX IDX_activity_logs_createdAt ON activity_logs(createdAt)
      `);
      console.log('Added index on createdAt column');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index if it exists
    const hasIndex = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'activity_logs' 
      AND index_name = 'IDX_activity_logs_createdAt'
    `);
    
    const indexCount = Number(hasIndex?.[0]?.count ?? 0);
    if (indexCount > 0) {
      await queryRunner.query(`
        DROP INDEX IDX_activity_logs_createdAt ON activity_logs
      `);
      console.log('Dropped index on createdAt column');
    }
    
    // Note: We don't remove the createdAt column as it's essential for the table
    console.log('Rollback complete - createdAt column retained');
  }
}
