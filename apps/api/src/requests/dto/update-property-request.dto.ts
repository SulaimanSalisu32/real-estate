import { IsIn } from 'class-validator';
import { PropertyRequestStatus } from '../schemas/property-request.schema';

export class UpdatePropertyRequestDto {
  @IsIn([
    PropertyRequestStatus.Contacted,
    PropertyRequestStatus.Approved,
    PropertyRequestStatus.Declined,
  ])
  status:
    | PropertyRequestStatus.Contacted
    | PropertyRequestStatus.Approved
    | PropertyRequestStatus.Declined;
}
