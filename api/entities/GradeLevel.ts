import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { StudentStatus, type Student } from './Student';

@Entity('grade_levels')
export class GradeLevel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, length: 50 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'level_order', type: 'int' })
  levelOrder!: number;

  @Column({ name: 'min_age', type: 'int', nullable: true })
  minAge?: number;

  @Column({ name: 'max_age', type: 'int', nullable: true })
  maxAge?: number;

  @Column({ name: 'max_students', type: 'int', default: 30 })
  maxStudents!: number;

  @Column({ name: 'academic_year', type: 'varchar', length: 20 })
  academicYear!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @OneToMany('Student', 'gradeLevel')
  students!: Student[];

  /**
   * Get current student count
   */
  get currentStudentCount(): number {
    return this.students ? this.students.filter(s => s.status === StudentStatus.ENROLLED).length : 0;
  }

  /**
   * Check if grade level has available capacity
   */
  hasAvailableCapacity(): boolean {
    return this.currentStudentCount < this.maxStudents;
  }

  /**
   * Get remaining capacity
   */
  getRemainingCapacity(): number {
    return Math.max(0, this.maxStudents - this.currentStudentCount);
  }

  /**
   * Check if grade level is at capacity
   */
  isAtCapacity(): boolean {
    return this.currentStudentCount >= this.maxStudents;
  }

  /**
   * Get display name with academic year
   */
  getDisplayName(): string {
    return `${this.name} (${this.academicYear})`;
  }
}
