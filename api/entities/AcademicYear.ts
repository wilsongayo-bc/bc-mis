import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('academic_years')
@Index(['year'], { unique: true })
export class AcademicYear {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 9 })
  year: string; // Format: YYYY-YYYY (e.g., 2024-2025)

  @Column({ type: 'boolean', default: false })
  isActive: boolean; // Only one academic year should be active at a time

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Validation method for year format
  static validateYearFormat(year: string): boolean {
    const pattern = /^\d{4}-\d{4}$/;
    if (!pattern.test(year)) return false;
    
    const [startYear, endYear] = year.split('-').map(Number);
    return endYear === startYear + 1;
  }

  // Helper method to generate academic year string
  static generateAcademicYear(startYear: number): string {
    return `${startYear}-${startYear + 1}`;
  }

  // Get current academic year (for queries)
  static getCurrentAcademicYear(): string {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 0-based month
    
    // If it's before June (month 6), we're still in the previous academic year
    // Academic year typically starts in June/July
    const academicStartYear = currentMonth < 6 ? currentYear - 1 : currentYear;
    
    return this.generateAcademicYear(academicStartYear);
  }
}