import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from './Student';
import { DocumentRequirement } from './DocumentRequirement';
import { User } from './User';

export enum DocumentStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  VERIFIED = 'verified',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export interface DocumentMetadata {
  originalName?: string;
  uploadedBy?: string;
  uploadedAt?: Date;
  verificationNotes?: string;
  rejectionReason?: string;
  expirationDate?: Date;
  customData?: Record<string, unknown>;
}

@Entity('student_documents')
export class StudentDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'student_id', type: 'varchar', length: 36 })
  studentId!: string;

  @Column({ name: 'requirement_id', type: 'varchar', length: 36 })
  requirementId!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath!: string;

  @Column({ name: 'file_type', type: 'varchar', length: 50, nullable: true })
  fileType?: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize?: number;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING
  })
  status!: DocumentStatus;

  @Column({ type: 'json', nullable: true })
  metadata?: DocumentMetadata;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt!: Date;

  @Column({ name: 'verified_at', type: 'datetime', nullable: true })
  verifiedAt?: Date;

  @Column({ name: 'verified_by', type: 'varchar', length: 36, nullable: true })
  verifiedBy?: string;

  @Column({ name: 'is_initial', type: 'boolean', default: false })
  isInitial!: boolean;

  // Relations
  @ManyToOne(() => Student, student => student.documents)
  @JoinColumn({ name: 'student_id' })
  student!: Student;

  @ManyToOne(() => DocumentRequirement, requirement => requirement.studentDocuments)
  @JoinColumn({ name: 'requirement_id' })
  requirement!: DocumentRequirement;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'verified_by' })
  verifier!: User;
}