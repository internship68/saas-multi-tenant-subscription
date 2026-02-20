import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? ((exception.getResponse() as any)?.message ?? exception.message)
      : 'Internal server error';

    const error =
      typeof message === 'string'
        ? message
        : Array.isArray(message)
          ? message.join(', ')
          : 'Unexpected error';

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
