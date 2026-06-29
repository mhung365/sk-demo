import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';

export class LocationHasBookingsException extends DomainException {
  constructor(id?: string) {
    super(
      id
        ? `Cannot delete location with existing bookings: ${id}`
        : 'Cannot delete location with existing bookings',
      HttpStatus.CONFLICT,
      'LOCATION_HAS_BOOKINGS',
    );
    this.name = 'LocationHasBookingsException';
  }
}
