import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PaymentMethod } from '../schemas/payment.schema';

export class ReportPaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsString()
  @MinLength(1)
  reference: string;

  @IsOptional()
  @IsString()
  note?: string;
}
