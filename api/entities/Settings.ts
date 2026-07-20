import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Settings entity for storing dynamic school configuration
 * Allows administrators to configure school-wide settings like school name, logo, etc.
 */
@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Setting key - unique identifier for the setting
   * Examples: 'school_name', 'school_logo', 'school_address', etc.
   */
  @Column({ type: 'varchar', unique: true, length: 100 })
  key!: string;

  /**
   * Setting value - the actual configuration value
   * Can store text, JSON, or other string-based data
   */
  @Column({ type: 'text' })
  value!: string;

  /**
   * Human-readable description of the setting
   * Helps administrators understand what this setting controls
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  /**
   * Setting category for grouping related settings
   * Examples: 'general', 'appearance', 'contact', etc.
   */
  @Column({ type: 'varchar', length: 50, default: 'general' })
  category!: string;

  /**
   * Whether this setting is editable by administrators
   * Some system settings might be read-only
   */
  @Column({ type: 'boolean', default: true })
  editable!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}