import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);
}
