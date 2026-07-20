import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('report_cache')
@Index(['cacheKey'], { unique: true })
@Index(['expiresAt'])
@Index(['reportType'])
export class ReportCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cache_key', type: 'varchar', length: 255 })
  cacheKey: string;

  @Column({ name: 'report_type', type: 'varchar', length: 100 })
  reportType: string;

  @Column({ type: 'json', nullable: true })
  filters: Record<string, unknown>;

  @Column({ type: 'json' })
  data: Record<string, unknown>;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}