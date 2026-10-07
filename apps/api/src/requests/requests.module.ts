import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Property, PropertySchema } from '../properties/schemas/property.schema';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import {
  PropertyRequest,
  PropertyRequestSchema,
} from './schemas/property-request.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: PropertyRequest.name, schema: PropertyRequestSchema },
    ]),
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
