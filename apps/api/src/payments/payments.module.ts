import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import {
  Property,
  PropertySchema,
} from '../properties/schemas/property.schema';
import {
  PropertyRequest,
  PropertyRequestSchema,
} from '../requests/schemas/property-request.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PropertyRequest.name, schema: PropertyRequestSchema },
      { name: Property.name, schema: PropertySchema },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
