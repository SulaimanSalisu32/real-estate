import { IsEmail, IsMongoId, IsString, MinLength } from 'class-validator';

export class CreateInquiryDto {
  @IsMongoId()
  property: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  phone: string;

  @IsString()
  @MinLength(1)
  message: string;
}
