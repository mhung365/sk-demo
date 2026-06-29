import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';

export class LocationHasChildrenException extends DomainException {
  constructor(id?: string) {
    super(
      id
        ? `Cannot delete location with child nodes: ${id}`
        : 'Cannot delete location with child nodes',
      HttpStatus.CONFLICT,
      'LOCATION_HAS_CHILDREN',
    );
    this.name = 'LocationHasChildrenException';
  }
}
