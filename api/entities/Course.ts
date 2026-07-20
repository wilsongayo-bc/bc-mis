import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Department } from './Department';
import { CourseSection } from './CourseSection';
import { Enrollment } from './Enrollment';
import { Subject } from './Subject';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, length: 20 })
  courseCode!: string;

  @Column({ type: 'varchar', length: 2, nullable: true, unique: true })
  idCode!: string | null;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'varchar', length: 36 })
  departmentId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tuitionPerUnit!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  miscellaneousFee!: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  downpaymentRate!: number | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Department, department => department.courses)
  @JoinColumn({ name: 'departmentId' })
  department!: Department;

  @OneToMany(() => CourseSection, courseSection => courseSection.course)
  sections!: CourseSection[];

  @OneToMany(() => Enrollment, enrollment => enrollment.course)
  enrollments!: Enrollment[];

  @OneToMany(() => Subject, subject => subject.course)
  subjects!: Subject[];
}
