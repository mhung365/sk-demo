import { Booking } from '../../bookings/entities/booking.entity';
import { Department } from '../../common/enums/department.enum';
import { OpenHours } from '../../common/types/open-hours.type';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @ManyToOne(() => Location, (location) => location.children, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: Location | null;

  @OneToMany(() => Location, (location) => location.parent)
  children!: Location[];

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'location_number', type: 'varchar', length: 64, unique: true })
  locationNumber!: string;

  @Column({
    type: 'enum',
    enum: Department,
    enumName: 'department',
    nullable: true,
  })
  department!: Department | null;

  @Column({ type: 'int', nullable: true })
  capacity!: number | null;

  @Column({ name: 'open_hours', type: 'jsonb', nullable: true })
  openHours!: OpenHours | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Booking, (booking) => booking.location)
  bookings!: Booking[];
}
