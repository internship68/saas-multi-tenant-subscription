import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

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

    const errorBody = {
      success: false,
      statusCode: status,
      message: typeof message === 'string' ? message : (Array.isArray(message) ? message[0] : 'Error'),
      path: request.url,
      timestamp: new Date().toISOString(),
      traceId: request.id || request.headers['x-request-id'],
    };

    // Structured logging for production
    this.logger.error({
      msg: `HTTP Exception: ${errorBody.message}`,
      status,
      method: request.method,
      path: request.url,
      traceId: errorBody.traceId,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json(errorBody);
  }
}
