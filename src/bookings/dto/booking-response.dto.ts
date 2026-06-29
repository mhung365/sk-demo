import { Department } from '../../common/enums/department.enum';
import { Booking } from '../entities/booking.entity';

export class BookingResponseDto {
  id!: string;
  locationId!: string;
  department!: Department;
  attendeeCount!: number;
  startAt!: string;
  endAt!: string;
  bookedBy!: string | null;
  createdAt!: string;

  static fromEntity(booking: Booking): BookingResponseDto {
    const dto = new BookingResponseDto();
    dto.id = booking.id;
    dto.locationId = booking.locationId;
    dto.department = booking.department;
    dto.attendeeCount = booking.attendeeCount;
    dto.startAt = booking.startAt.toISOString();
    dto.endAt = booking.endAt.toISOString();
    dto.bookedBy = booking.bookedBy;
    dto.createdAt = booking.createdAt.toISOString();
    return dto;
  }
}
