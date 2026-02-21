import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateCheckoutDto {
    @IsString()
    @IsNotEmpty()
    priceId!: string;

    @IsString()
    @IsUrl({}, { message: 'successUrl must be a valid URL' })
    successUrl!: string;

    @IsString()
    @IsUrl({}, { message: 'cancelUrl must be a valid URL' })
    cancelUrl!: string;
}
