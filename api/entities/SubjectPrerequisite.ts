import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Subject } from './Subject';

export enum PrerequisiteCategory {
  REQUIRED = 'required',
  COREQUISITE = 'corequisite'
}

@Entity('subject_prerequisites')
@Unique(['subjectId', 'prerequisiteId'])
export class SubjectPrerequisite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  subjectId!: string;

  @Column({ type: 'varchar', length: 36 })
  prerequisiteId!: string;

  @Column({
    type: 'enum',
    enum: PrerequisiteCategory,
    default: PrerequisiteCategory.REQUIRED
  })
  category!: PrerequisiteCategory;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Subject, subject => subject.prerequisites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  subject!: Subject;

  @ManyToOne(() => Subject, subject => subject.requiredBy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prerequisiteId' })
  prerequisiteSubject!: Subject;
}