import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from './Student';
import { Enrollment } from './Enrollment';

export enum PaymentType {
  TUITION = 'TUITION',
  REGISTRATION = 'REGISTRATION',
  LIBRARY = 'LIBRARY',
  LABORATORY = 'LABORATORY',
  MISCELLANEOUS = 'MISCELLANEOUS'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  CHECK = 'CHECK'
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  studentId!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  enrollmentId?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({
    type: 'enum',
    enum: PaymentType
  })
  type!: PaymentType;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  status!: PaymentStatus;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  semester!: string | null;

  @Column({ type: 'int', nullable: true })
  year!: number | null;

  @Column({ type: 'date', nullable: true })
  paidDate!: Date;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true
  })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionId!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Student, student => student.payments)
  @JoinColumn({ name: 'studentId' })
  student!: Student;

  @ManyToOne(() => Enrollment, enrollment => enrollment.payments, { nullable: true })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment?: Enrollment | null;
}
