import { IsEnum } from 'class-validator';
import { InquiryStatus } from '../schemas/inquiry.schema';

export class UpdateInquiryDto {
  @IsEnum(InquiryStatus)
  status: InquiryStatus;
}
