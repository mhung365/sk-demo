import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';

export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const body = this.buildErrorResponse(exception);

    if (body.statusCode >= 500) {
      this.logger.error(
        `${body.statusCode} ${body.error}: ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (body.statusCode >= 400) {
      this.logger.warn(`${body.statusCode} ${body.error}: ${body.message}`);
    }

    response.status(body.statusCode).json(body);
  }

  private buildErrorResponse(exception: unknown): ErrorResponseBody {
    if (exception instanceof DomainException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      return {
        statusCode: status,
        error: this.statusText(status),
        message:
          typeof response === 'object' && response !== null && 'message' in response
            ? String((response as { message: string }).message)
            : exception.message,
        code: exception.code,
        details: exception.details,
      };
    }

    if (exception instanceof BadRequestException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message = this.extractValidationMessage(response);

      return {
        statusCode: status,
        error: 'Bad Request',
        message,
        code: 'VALIDATION_ERROR',
        details:
          typeof response === 'object' && response !== null && 'message' in response
            ? { errors: (response as { message: string | string[] }).message }
            : undefined,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'object' && response !== null) {
        const payload = response as Record<string, unknown>;
        return {
          statusCode: status,
          error: this.statusText(status),
          message: this.extractMessage(payload.message ?? exception.message),
          code: typeof payload.code === 'string' ? payload.code : undefined,
          details:
            typeof payload.details === 'object' && payload.details !== null
              ? (payload.details as Record<string, unknown>)
              : undefined,
        };
      }

      return {
        statusCode: status,
        error: this.statusText(status),
        message: this.extractMessage(response),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    };
  }

  private extractValidationMessage(response: string | object): string {
    if (typeof response === 'string') {
      return response;
    }

    if ('message' in response) {
      const message = (response as { message: string | string[] }).message;
      if (Array.isArray(message)) {
        return message.join('; ');
      }
      return String(message);
    }

    return 'Validation failed';
  }

  private extractMessage(message: unknown): string {
    if (Array.isArray(message)) {
      return message.join('; ');
    }
    return String(message);
  }

  private statusText(status: number): string {
    const labels: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
    };
    return labels[status] ?? 'Error';
  }
}
