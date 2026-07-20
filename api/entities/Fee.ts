import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Course } from './Course';

export enum FeeType {
  TUITION = 'TUITION',
  MISCELLANEOUS = 'MISC',
  LABORATORY = 'LAB',
  OTHER = 'OTHER'
}

@Entity('fees')
export class Fee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({
    type: 'enum',
    enum: FeeType,
    default: FeeType.OTHER
  })
  type!: FeeType;

  @Column({ type: 'boolean', default: false })
  isPerUnit!: boolean;

  // Targeting - if null, applies to all
  @Column({ type: 'varchar', length: 36, nullable: true })
  courseId?: string;

  @Column({ type: 'int', nullable: true })
  yearLevel?: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course?: Course;
}
