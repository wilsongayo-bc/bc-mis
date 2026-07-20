import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { Student } from './Student';
import { Employee } from './Employee';

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STAFF = 'STAFF',
  STUDENT = 'STUDENT',
  REGISTRAR = 'REGISTRAR',
  FINANCE = 'FINANCE',
  LIBRARIAN = 'LIBRARIAN'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({ type: 'datetime', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  middleInitial!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 100 })
  position!: string;

  @Column({
    type: 'enum',
    enum: UserRole
  })
  role!: UserRole;

  @Column({ type: 'simple-json', nullable: true })
  roles?: UserRole[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastLogin!: Date;

  @Column({ type: 'text', nullable: true })
  avatarUrl?: string;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled!: boolean;

  @Column({ type: 'boolean', default: false })
  mustChangePassword!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  twoFactorEmail?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToOne(() => Student, student => student.user)
  student!: Student;

  @OneToOne(() => Employee, employee => employee.user)
  employee!: Employee;
}
