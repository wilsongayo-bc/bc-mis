import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Course } from './Course';
import { Enrollment } from './Enrollment';
import { Schedule } from './Schedule';

@Entity('course_sections')
@Index(['courseId', 'yearLevel', 'sectionName', 'semester', 'academicYear'], { unique: true })
export class CourseSection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  courseId!: string;

  @Column({ 
    type: 'enum', 
    enum: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'] 
  })
  yearLevel!: string;

  @Column({ type: 'varchar', length: 50 })
  sectionName!: string;

  @Column({ type: 'int' })
  credits!: number;

  @Column({ type: 'int' })
  maxStudents!: number;

  @Column({ 
    type: 'enum', 
    enum: ['First Semester', 'Second Semester', 'Summer'],
    default: 'First Semester'
  })
  semester!: string;

  @Column({ type: 'varchar', length: 10 })
  academicYear!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Course, course => course.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course!: Course;

  @OneToMany(() => Enrollment, enrollment => enrollment.courseSection)
  enrollments!: Enrollment[];

  @OneToMany(() => Schedule, schedule => schedule.courseSection)
  schedules!: Schedule[];
}
