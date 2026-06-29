import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';

export class BookingOverlapException extends DomainException {
  constructor(locationId: string, startAt: Date, endAt: Date) {
    super(
      'Booking overlaps an existing reservation for this room',
      HttpStatus.CONFLICT,
      'BOOKING_OVERLAP',
      {
        locationId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      },
    );
    this.name = 'BookingOverlapException';
  }
}
