import { HttpStatus } from '@nestjs/common';
import { OpenHours } from '../../common/types/open-hours.type';
import { DomainException } from '../../common/exceptions/domain.exception';

export class OutsideOpenHoursException extends DomainException {
  constructor(startAt: Date, endAt: Date, openHours: OpenHours) {
    super(
      'Booking falls outside the room open hours',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'OUTSIDE_OPEN_HOURS',
      {
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        openHours,
      },
    );
    this.name = 'OutsideOpenHoursException';
  }
}
