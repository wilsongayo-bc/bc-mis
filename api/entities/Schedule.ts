import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Subject } from './Subject';
import { CourseSection } from './CourseSection';
import { Employee } from './Employee';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  subjectId!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  courseSectionId!: string;

  @Column({ type: 'varchar', length: 36 })
  teacherId!: string;

  @Column({
    type: 'varchar',
    length: 255
  })
  dayOfWeek!: string;

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  @Column({ type: 'varchar', length: 50 })
  room!: string;

  @Column({ type: 'varchar', length: 20 })
  semester!: string;

  @Column({ type: 'varchar', length: 10 })
  academicYear!: string;

  @Column({ type: 'date', nullable: true })
  startDate!: string;

  @Column({ type: 'date', nullable: true })
  endDate!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Subject, subject => subject.schedules)
  @JoinColumn({ name: 'subjectId' })
  subject!: Subject;

  @ManyToOne(() => CourseSection, courseSection => courseSection.schedules)
  @JoinColumn({ name: 'courseSectionId' })
  courseSection!: CourseSection;

  @ManyToOne(() => Employee, employee => employee.schedules)
  @JoinColumn({ name: 'teacherId' })
  teacher!: Employee;
}