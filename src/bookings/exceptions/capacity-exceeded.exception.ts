import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';

export class CapacityExceededException extends DomainException {
  constructor(attendeeCount: number, capacity: number) {
    super(
      `Capacity exceeded: ${attendeeCount} attendees exceeds room capacity of ${capacity}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'CAPACITY_EXCEEDED',
      { attendeeCount, capacity },
    );
    this.name = 'CapacityExceededException';
  }
}
