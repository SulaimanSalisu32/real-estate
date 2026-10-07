import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';

export enum PropertyType {
  House = 'house',
  Land = 'land',
  Apartment = 'apartment',
}

export enum ListingType {
  Sale = 'sale',
  Rent = 'rent',
}

export enum PropertyStatus {
  Available = 'available',
  Reserved = 'reserved',
  Sold = 'sold',
  Rented = 'rented',
}

export type PropertyDocument = HydratedDocument<Property>;

@Schema({ timestamps: true })
export class Property {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ type: String, required: true, enum: PropertyType })
  type: PropertyType;

  @Prop({ type: String, required: true, enum: ListingType })
  listingType: ListingType;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ default: 'USD', uppercase: true, trim: true })
  currency: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true, trim: true })
  country: string;

  @Prop({ min: 0 })
  bedrooms?: number;

  @Prop({ min: 0 })
  bathrooms?: number;

  @Prop({ min: 0 })
  area?: number;

  @Prop({ trim: true })
  areaUnit?: string;

  @Prop({ type: String, enum: PropertyStatus, default: PropertyStatus.Available })
  status: PropertyStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Agent', required: true })
  agent: Types.ObjectId;
}

export const PropertySchema = SchemaFactory.createForClass(Property);
