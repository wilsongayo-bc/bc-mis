import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from './Student';
import { Book } from './Book';

export enum BorrowStatus {
  BORROWED = 'BORROWED',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  LOST = 'LOST'
}

@Entity('borrow_records')
export class BorrowRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  studentId!: string;

  @Column({ type: 'varchar', length: 36 })
  bookId!: string;

  @Column({ type: 'date' })
  borrowDate!: Date;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({ type: 'date', nullable: true })
  returnDate!: Date;

  @Column({
    type: 'enum',
    enum: BorrowStatus,
    default: BorrowStatus.BORROWED
  })
  status!: BorrowStatus;

  @Column({ type: 'int', default: 0 })
  renewalCount!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  fineAmount!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Student, student => student.borrowRecords)
  @JoinColumn({ name: 'studentId' })
  student!: Student;

  @ManyToOne(() => Book, book => book.borrowRecords)
  @JoinColumn({ name: 'bookId' })
  book!: Book;
}