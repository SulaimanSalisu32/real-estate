import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import { UserRole } from '../auth.types';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({
    type: String,
    required: true,
    enum: UserRole,
    default: UserRole.Client,
  })
  role: UserRole;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Agent' })
  agent?: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
