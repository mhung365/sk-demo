import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';

export class BookingNotFoundException extends DomainException {
  constructor(identifier?: string) {
    super(
      identifier ? `Booking not found: ${identifier}` : 'Booking not found',
      HttpStatus.NOT_FOUND,
      'BOOKING_NOT_FOUND',
    );
    this.name = 'BookingNotFoundException';
  }
}
