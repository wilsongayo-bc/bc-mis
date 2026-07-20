import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { DocumentCategory } from './DocumentCategory';
import { StudentDocument } from './StudentDocument';
import { User } from './User';

export interface ValidationRules {
  allowedFileTypes?: string[];
  maxFileSize?: number;
  requiresVerification?: boolean;
  customValidation?: Record<string, unknown>;
}

@Entity('document_requirements')
export class DocumentRequirement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_required', type: 'boolean', default: true })
  isRequired!: boolean;

  @Column({ name: 'is_initial', type: 'boolean', default: false })
  isInitial!: boolean;

  @Column({ name: 'category_id', type: 'varchar', length: 36, nullable: true })
  categoryId?: string;

  @Column({ name: 'validation_rules', type: 'json', nullable: true })
  validationRules?: ValidationRules;

  @Column({ name: 'applicable_grade_levels', type: 'json', nullable: true })
  applicableGradeLevels?: string[];

  @Column({ name: 'expiration_days', type: 'int', nullable: true })
  expirationDays?: number;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => DocumentCategory, category => category.requirements)
  @JoinColumn({ name: 'category_id' })
  category!: DocumentCategory;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @OneToMany(() => StudentDocument, studentDocument => studentDocument.requirement)
  studentDocuments!: StudentDocument[];
}