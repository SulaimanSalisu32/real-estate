import { IsIn } from 'class-validator';
import { PaymentStatus } from '../schemas/payment.schema';

export class UpdatePaymentDto {
  @IsIn([PaymentStatus.Paid, PaymentStatus.Rejected])
  status: PaymentStatus.Paid | PaymentStatus.Rejected;
}
