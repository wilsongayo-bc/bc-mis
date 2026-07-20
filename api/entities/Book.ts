import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BorrowRecord } from './BorrowRecord';
import { GradeLevel } from './GradeLevel';
import { Course } from './Course';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, length: 20 })
  isbn!: string;

  @Column({ type: 'varchar', length: 300 })
  title!: string;

  @Column({ type: 'varchar', length: 200 })
  author!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  publisher!: string;

  @Column({ type: 'int', nullable: true })
  publishedYear!: number;

  @Column({ type: 'varchar', length: 100 })
  category!: string;

  @Column({ type: 'int', default: 1 })
  totalCopies!: number;

  @Column({ type: 'int', default: 1 })
  availableCopies!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'English' })
  language?: string;

  @Column({ type: 'int', nullable: true })
  pages?: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  edition?: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  gradeLevelId?: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  courseId?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  externalLink?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImageUrl?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => BorrowRecord, borrowRecord => borrowRecord.book)
  borrowRecords!: BorrowRecord[];

  @ManyToOne(() => GradeLevel, { nullable: true })
  @JoinColumn({ name: 'gradeLevelId' })
  gradeLevel?: GradeLevel;

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'courseId' })
  course?: Course;
}