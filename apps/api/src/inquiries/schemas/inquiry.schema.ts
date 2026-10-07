import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';

export enum InquiryStatus {
  New = 'new',
  Contacted = 'contacted',
  Closed = 'closed',
}

export type InquiryDocument = HydratedDocument<Inquiry>;

@Schema({ timestamps: true })
export class Inquiry {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Property', required: true })
  property: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Agent', required: true })
  agent: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({ type: String, enum: InquiryStatus, default: InquiryStatus.New })
  status: InquiryStatus;
}

export const InquirySchema = SchemaFactory.createForClass(Inquiry);
