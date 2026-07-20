import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './User';
import { Schedule } from './Schedule';

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED'
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, length: 20 })
  employeeId!: string;

  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'varchar', length: 100 })
  department!: string;

  @Column({ type: 'varchar', length: 100 })
  position!: string;

  @Column({ type: 'date' })
  hireDate!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salary!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber!: string;

  @Column({ type: 'text', nullable: true })
  address!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  emergencyContact!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  emergencyPhone!: string;

  @Column({
    type: 'enum',
    enum: EmployeeStatus,
    default: EmployeeStatus.ACTIVE
  })
  status!: EmployeeStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToOne(() => User, user => user.employee)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @OneToMany(() => Schedule, schedule => schedule.teacher)
  schedules!: Schedule[];
}