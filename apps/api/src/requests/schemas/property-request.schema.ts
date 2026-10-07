import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import { ListingType } from '../../properties/schemas/property.schema';

export enum PropertyRequestStatus {
  New = 'new',
  Contacted = 'contacted',
  Approving = 'approving',
  Approved = 'approved',
  Declined = 'declined',
}

export enum PropertyPaymentStatus {
  Unpaid = 'unpaid',
  Reported = 'reported',
  Paid = 'paid',
  Pending = 'pending',
  CheckoutPending = 'checkout_pending',
}

export type PropertyRequestDocument = HydratedDocument<PropertyRequest>;

@Schema({ timestamps: true })
export class PropertyRequest {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Property', required: true })
  property: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Agent', required: true })
  agent: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  client: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ListingType })
  listingType: ListingType;

  @Prop({ min: 0 })
  approvedAmount?: number;

  @Prop({ uppercase: true, trim: true })
  approvedCurrency?: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({
    type: String,
    required: true,
    enum: PropertyRequestStatus,
    default: PropertyRequestStatus.New,
  })
  status: PropertyRequestStatus;

  @Prop({
    type: String,
    required: true,
    enum: PropertyPaymentStatus,
    default: PropertyPaymentStatus.Unpaid,
  })
  paymentStatus: PropertyPaymentStatus;
}

export const PropertyRequestSchema =
  SchemaFactory.createForClass(PropertyRequest);
