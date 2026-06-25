import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
}
