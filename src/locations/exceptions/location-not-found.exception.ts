import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';

export class LocationNotFoundException extends DomainException {
  constructor(identifier?: string) {
    super(
      identifier ? `Location not found: ${identifier}` : 'Location not found',
      HttpStatus.NOT_FOUND,
      'LOCATION_NOT_FOUND',
    );
    this.name = 'LocationNotFoundException';
  }
}
