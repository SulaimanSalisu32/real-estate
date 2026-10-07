import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export enum PaymentStatus {
  Reported = 'reported',
  Confirming = 'confirming',
  Paid = 'paid',
  Rejected = 'rejected',
}

export enum PaymentMethod {
  BankTransfer = 'bank_transfer',
  Cash = 'cash',
}

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'PropertyRequest',
    required: true,
    unique: true,
  })
  request: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  client: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Property', required: true })
  property: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  amount: number;

  @Prop({ required: true, lowercase: true, minlength: 3, maxlength: 3 })
  currency: string;

  @Prop({ required: true, enum: PaymentStatus, default: PaymentStatus.Reported })
  status: PaymentStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Agent', required: true })
  agent: Types.ObjectId;

  @Prop({ required: true, enum: PaymentMethod })
  method: PaymentMethod;

  @Prop({ required: true, trim: true })
  reference: string;

  @Prop({ trim: true })
  note?: string;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  confirmedBy?: Types.ObjectId;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
