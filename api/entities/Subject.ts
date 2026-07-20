import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Department } from './Department';
import { Course } from './Course';
import { Schedule } from './Schedule';
import { SubjectPrerequisite } from './SubjectPrerequisite';

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, length: 20 })
  code!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'integer', nullable: false })
  units!: number;

  @Column({ type: 'integer', default: 0 })
  lectureHours!: number;

  @Column({ type: 'integer', default: 0 })
  labHours!: number;

  @Column({ type: 'varchar', length: 36, nullable: true })
  departmentId!: string; // Made nullable in migration logic if we transition, but keeping as is or changing to nullable if schema changed. Migration didn't change this.

  @Column({ type: 'varchar', length: 36, nullable: true })
  courseId?: string;

  @Column({ type: 'integer', nullable: true })
  yearLevel?: number;

  @Column({ 
    type: 'enum', 
    enum: ['First Semester', 'Second Semester', 'Summer'],
    nullable: true
  })
  semester?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  // Dweezil's Code - Make department optional since departmentId is nullable
  @ManyToOne(() => Department, department => department.subjects, { nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department?: Department;

  @ManyToOne(() => Course, course => course.subjects)
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @OneToMany(() => Schedule, schedule => schedule.subject)
  schedules!: Schedule[];

  // Prerequisites - subjects that are required before taking this subject
  @OneToMany(() => SubjectPrerequisite, prerequisite => prerequisite.subject)
  prerequisites!: SubjectPrerequisite[];

  // Required by - subjects that require this subject as a prerequisite
  @OneToMany(() => SubjectPrerequisite, prerequisite => prerequisite.prerequisiteSubject)
  requiredBy!: SubjectPrerequisite[];
}