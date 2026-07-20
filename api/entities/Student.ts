import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, OneToMany, ManyToOne } from 'typeorm';
import { User } from './User';
import { GradeLevel } from './GradeLevel';
import { Enrollment } from './Enrollment';
import { Payment } from './Payment';
import { BorrowRecord } from './BorrowRecord';
import { StudentDocument } from './StudentDocument';
import { Course } from './Course';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER'
}

export enum StudentStatus {
  ENROLLED = 'ENROLLED',
  PRE_REGISTERED = 'PRE_REGISTERED'
}

export enum RegistrationStatus {
  PRE_REGISTERED = 'PRE_REGISTERED',
  REGISTERED = 'REGISTERED',
  WITHDRAWN = 'WITHDRAWN'
}

export interface DocumentRequirement {
  id?: string;
  type: string;
  name: string;
  description?: string;
  required: boolean;
  submitted: boolean;
  submittedDate?: Date;
  notes?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  group?: string;
}

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, length: 20, nullable: true })
  studentId?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  temporaryId?: string;

  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'date' })
  dateOfBirth!: Date;

  @Column({
    type: 'enum',
    enum: Gender
  })
  gender!: Gender;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ name: 'guardian_name', type: 'varchar', length: 200, nullable: true })
  guardianName?: string;

  @Column({ name: 'guardian_phone', type: 'varchar', length: 20, nullable: true })
  guardianPhone?: string;

  @Column({ name: 'guardian_email', type: 'varchar', length: 255, nullable: true })
  guardianEmail?: string;

  @Column({ name: 'emergencyContact', type: 'varchar', length: 100, nullable: true })
  emergencyContact?: string;

  @Column({ name: 'emergencyPhone', type: 'varchar', length: 20, nullable: true })
  emergencyPhone?: string;

  @Column({ name: 'grade_level_id', type: 'varchar', nullable: true })
  gradeLevelId?: string;

  // Dweezil's Code - Temporary storage for course selection before enrollment is created
  @Column({ type: 'varchar', length: 36, nullable: true })
  courseId?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  idCode?: string;

  @Column({ name: 'medical_info', type: 'text', nullable: true })
  medicalInfo?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance!: number;

  @Column({ name: 'graduation_date', type: 'date', nullable: true })
  graduationDate?: Date;

  @Column({ type: 'date', nullable: true })
  enrollmentDate?: Date;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.PRE_REGISTERED
  })
  status!: StudentStatus;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.PRE_REGISTERED
  })
  registrationStatus!: RegistrationStatus;

  @Column({ type: 'json', nullable: true })
  documentsRequired?: DocumentRequirement[];

  @Column({ type: 'json', nullable: true })
  documentsSubmitted?: DocumentRequirement[];

  @Column({ name: 'registration_notes', type: 'text', nullable: true })
  registrationNotes?: string;

  @Column({ name: 'verification_date', type: 'date', nullable: true })
  verificationDate?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToOne(() => User, user => user.student)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => GradeLevel, gradeLevel => gradeLevel.students)
  @JoinColumn({ name: 'grade_level_id' })
  gradeLevel?: GradeLevel;

  // Dweezil's Code - Course relation for temporary storage before enrollment
  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @OneToMany(() => Enrollment, enrollment => enrollment.student)
  enrollments!: Enrollment[];

  @OneToMany(() => Payment, payment => payment.student)
  payments!: Payment[];

  @OneToMany(() => BorrowRecord, borrowRecord => borrowRecord.student)
  borrowRecords!: BorrowRecord[];

  @OneToMany(() => StudentDocument, studentDocument => studentDocument.student)
  documents!: StudentDocument[];
}
