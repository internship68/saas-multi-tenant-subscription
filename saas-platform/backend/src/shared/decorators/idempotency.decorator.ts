import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENCY_KEY = 'idempotency_key';
export const Idempotent = () => SetMetadata(IDEMPOTENCY_KEY, true);
