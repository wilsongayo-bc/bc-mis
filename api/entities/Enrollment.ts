import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Student } from './Student';
import { Course } from './Course';
import { CourseSection } from './CourseSection';
import { Payment } from './Payment';

export enum EnrollmentStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  ENROLLED = 'ENROLLED',
  COMPLETED = 'COMPLETED',
  DROPPED = 'DROPPED',
  FAILED = 'FAILED'
}

@Entity('enrollments')
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  studentId!: string;

  @Column({ type: 'varchar', length: 36 })
  courseId!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  courseSectionId?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  academicYear?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  semester?: string | null;

  @Column({ type: 'date' })
  enrollmentDate!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAssessed!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalPaid!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  downpaymentRequired!: number;

  @Column({ type: 'json', nullable: true })
  assessmentDetails?: unknown;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.PENDING
  })
  status!: EnrollmentStatus;

  @Column({ type: 'text', nullable: true })
  registrarRemarks?: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  grade!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalScore!: number;

  @Column({ type: 'json', nullable: true })
  selectedSubjects?: string[];

  @Column({ type: 'boolean', default: false })
  submittedByStudent!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  studentSubmissionDate?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Student, student => student.enrollments)
  @JoinColumn({ name: 'studentId' })
  student!: Student;

  @ManyToOne(() => Course, course => course.enrollments)
  @JoinColumn({ name: 'courseId' })
  course!: Course;

  @ManyToOne(() => CourseSection, courseSection => courseSection.enrollments, { nullable: true })
  @JoinColumn({ name: 'courseSectionId' })
  courseSection?: CourseSection;

  @OneToMany(() => Payment, payment => payment.enrollment)
  payments?: Payment[];
}
