import { IsEnum, IsInt, IsPositive, IsString, IsUUID } from 'class-validator';
import { SubscriptionPlan } from '../../domain/subscription.entity';

export class UpgradeSubscriptionDto {
  @IsUUID()
  @IsString()
  organizationId!: string;

  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;

  @IsInt()
  @IsPositive()
  durationInDays!: number;
}
