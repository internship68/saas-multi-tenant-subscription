import { IsString, IsUUID } from 'class-validator';

export class CancelSubscriptionDto {
  @IsUUID()
  @IsString()
  organizationId!: string;
}
