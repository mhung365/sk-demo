import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';

export class LocationNotBookableException extends DomainException {
  constructor(locationId: string) {
    super(
      `Location is not bookable: ${locationId}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'LOCATION_NOT_BOOKABLE',
      { locationId },
    );
    this.name = 'LocationNotBookableException';
  }
}
