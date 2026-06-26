import { Location } from '../../locations/entities/location.entity';
import { Department } from '../../common/enums/department.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @ManyToOne(() => Location, (location) => location.bookings, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'location_id' })
  location!: Location;

  @Column({
    type: 'enum',
    enum: Department,
    enumName: 'department',
  })
  department!: Department;

  @Column({ name: 'attendee_count', type: 'int' })
  attendeeCount!: number;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt!: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt!: Date;

  @Column({ name: 'booked_by', type: 'varchar', length: 255, nullable: true })
  bookedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
