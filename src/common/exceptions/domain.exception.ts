import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ message, code, details }, status);
    this.name = 'DomainException';
  }
}
