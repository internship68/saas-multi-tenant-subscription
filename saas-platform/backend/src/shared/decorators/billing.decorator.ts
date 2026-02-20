import { SetMetadata } from '@nestjs/common';

export const CheckUsage = (type: string = 'API_CALLS') => SetMetadata('usageType', type);
export const RequireFeature = (feature: string) => SetMetadata('feature', feature);
