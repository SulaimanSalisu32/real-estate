import { IsMongoId, IsString, MinLength } from 'class-validator';

export class CreatePropertyRequestDto {
  @IsMongoId()
  property: string;

  @IsString()
  @MinLength(1)
  phone: string;

  @IsString()
  @MinLength(1)
  message: string;
}
