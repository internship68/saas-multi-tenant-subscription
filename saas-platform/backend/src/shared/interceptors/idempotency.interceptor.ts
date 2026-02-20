import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import { IDEMPOTENCY_KEY } from '../decorators/idempotency.decorator';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) { }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const isIdempotent = this.reflector.get<boolean>(IDEMPOTENCY_KEY, context.getHandler());
        if (!isIdempotent) {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest();
        const idempotencyKey = request.headers['idempotency-key'];

        if (!idempotencyKey) {
            throw new BadRequestException('Idempotency-Key header is required for this endpoint');
        }

        const userId = request.user?.id || 'anonymous';
        const requestPath = request.url;
        const bodyHash = createHash('sha256')
            .update(JSON.stringify(request.body || {}))
            .digest('hex');

        // 1. Check if record exists
        const record = await this.prisma.idempotencyRecord.findUnique({
            where: { id: idempotencyKey, userId },
        });

        if (record) {
            // Safety check: ensure same body hash and path
            if (record.requestBodyHash !== bodyHash || record.requestPath !== requestPath) {
                throw new ConflictException('Idempotency-Key used with different request parameters');
            }

            // Return recorded response
            const response = context.switchToHttp().getResponse();
            response.status(record.responseStatus);
            return of(record.responseBody);
        }

        // 2. Proceed and record
        return next.handle().pipe(
            tap(async (data) => {
                const response = context.switchToHttp().getResponse();

                // Save to DB (Fire and forget or await? Safer to await but adds latency)
                try {
                    await this.prisma.idempotencyRecord.create({
                        data: {
                            id: idempotencyKey,
                            userId,
                            requestPath,
                            requestBodyHash: bodyHash,
                            responseStatus: response.statusCode,
                            responseBody: data || {},
                            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                        },
                    });
                } catch (e) {
                    // Handle race condition if two identical requests hit at exactly the same time
                    // (unique constraint on id+userId will fire)
                    console.error('Idempotency recording error:', e);
                }
            }),
        );
    }
}
