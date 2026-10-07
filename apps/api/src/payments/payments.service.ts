import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthenticatedUser, UserRole } from '../auth/auth.types';
import {
  Property,
  PropertyDocument,
  PropertyStatus,
} from '../properties/schemas/property.schema';
import {
  PropertyPaymentStatus,
  PropertyRequest,
  PropertyRequestDocument,
  PropertyRequestStatus,
} from '../requests/schemas/property-request.schema';
import { ReportPaymentDto } from './dto/report-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from './schemas/payment.schema';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(PropertyRequest.name)
    private readonly requestModel: Model<PropertyRequestDocument>,
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  async reportPayment(
    requestId: string,
    dto: ReportPaymentDto,
    user: AuthenticatedUser,
  ) {
    const request = await this.requestModel.findById(requestId).exec();
    if (!request) {
      throw new NotFoundException(`Request "${requestId}" was not found`);
    }
    if (request.client.toString() !== user.id) {
      throw new ForbiddenException('This request belongs to another client');
    }
    if (request.status !== PropertyRequestStatus.Approved) {
      throw new ConflictException(
        'The agent must approve the request before payment can be reported',
      );
    }
    if (request.paymentStatus === PropertyPaymentStatus.Paid) {
      throw new ConflictException('This request has already been paid');
    }
    if (request.paymentStatus === PropertyPaymentStatus.Reported) {
      throw new ConflictException(
        'Payment was already reported and is awaiting agent confirmation',
      );
    }

    const property = await this.propertyModel.findById(request.property).exec();
    if (!property || property.status !== PropertyStatus.Reserved) {
      throw new ConflictException(
        'The property is not reserved for this approved request',
      );
    }
    const amount = request.approvedAmount ?? property.price;
    const currency = request.approvedCurrency ?? property.currency;
    if (!Number.isFinite(amount) || amount <= 0 || !currency) {
      throw new ConflictException('The approved listing price is invalid');
    }

    const reported = await this.requestModel
      .findOneAndUpdate(
        {
          _id: request._id,
          client: new Types.ObjectId(user.id),
          status: PropertyRequestStatus.Approved,
          paymentStatus: {
            $in: [
              PropertyPaymentStatus.Unpaid,
              PropertyPaymentStatus.Pending,
              PropertyPaymentStatus.CheckoutPending,
            ],
          },
        },
        { $set: { paymentStatus: PropertyPaymentStatus.Reported } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!reported) {
      throw new ConflictException(
        'This request payment has already been reported',
      );
    }

    try {
      const payment = await this.paymentModel
        .findOneAndUpdate(
          { request: request._id },
          {
            $set: {
              client: request.client,
              property: property._id,
              agent: request.agent,
              amount,
              currency: currency.toUpperCase(),
              method: dto.method,
              reference: dto.reference.trim(),
              note: dto.note?.trim(),
              status: PaymentStatus.Reported,
            },
            $unset: {
              confirmedAt: 1,
              confirmedBy: 1,
            },
          },
          { upsert: true, returnDocument: 'after' },
        )
        .exec();
      if (!payment) {
        throw new Error('Could not save the payment report');
      }
      return payment;
    } catch (error) {
      await this.requestModel
        .updateOne(
          {
            _id: request._id,
            paymentStatus: PropertyPaymentStatus.Reported,
          },
          { $set: { paymentStatus: PropertyPaymentStatus.Unpaid } },
        )
        .exec();
      throw error;
    }
  }

  findMine(user: AuthenticatedUser) {
    return this.paymentModel
      .find(this.scope(user))
      .populate('request', 'listingType status paymentStatus')
      .populate('property', 'title city country')
      .populate('client', 'firstName lastName email')
      .populate('agent', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(
    id: string,
    dto: UpdatePaymentDto,
    user: AuthenticatedUser,
  ) {
    const payment = await this.paymentModel
      .findOne({ _id: id, ...this.scope(user) })
      .exec();
    if (!payment) {
      throw new NotFoundException(`Payment "${id}" was not found`);
    }
    if (payment.status !== PaymentStatus.Reported) {
      throw new ConflictException(
        'Only a reported payment can be confirmed or rejected',
      );
    }

    const locked = await this.paymentModel
      .findOneAndUpdate(
        { _id: payment._id, status: PaymentStatus.Reported },
        { $set: { status: PaymentStatus.Confirming } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!locked) {
      throw new ConflictException('This payment is being reviewed already');
    }

    const request = await this.requestModel
      .findOne({
        _id: payment.request,
        agent: payment.agent,
        status: PropertyRequestStatus.Approved,
      })
      .exec();
    if (!request) {
      await this.paymentModel
        .updateOne(
          { _id: payment._id, status: PaymentStatus.Confirming },
          { $set: { status: PaymentStatus.Reported } },
        )
        .exec();
      throw new ConflictException('The approved property request was not found');
    }

    if (dto.status === PaymentStatus.Rejected) {
      await this.paymentModel
        .updateOne(
          { _id: payment._id, status: PaymentStatus.Confirming },
          {
            $set: { status: PaymentStatus.Rejected },
            $unset: { confirmedAt: 1, confirmedBy: 1 },
          },
        )
        .exec();
      await this.requestModel
        .updateOne(
          {
            _id: request._id,
            paymentStatus: PropertyPaymentStatus.Reported,
          },
          { $set: { paymentStatus: PropertyPaymentStatus.Unpaid } },
        )
        .exec();
      return this.findPayment(payment._id, user);
    }

    const occupiedStatus =
      request.listingType === 'rent'
        ? PropertyStatus.Rented
        : PropertyStatus.Sold;
    const property = await this.propertyModel
      .findOneAndUpdate(
        {
          _id: payment.property,
          status: PropertyStatus.Reserved,
        },
        { $set: { status: occupiedStatus } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!property) {
      await this.paymentModel
        .updateOne(
          { _id: payment._id, status: PaymentStatus.Confirming },
          { $set: { status: PaymentStatus.Reported } },
        )
        .exec();
      throw new ConflictException(
        'The reserved property could not be marked occupied',
      );
    }

    await this.paymentModel
      .updateOne(
        { _id: payment._id, status: PaymentStatus.Confirming },
        {
          $set: {
            status: PaymentStatus.Paid,
            confirmedAt: new Date(),
            confirmedBy: new Types.ObjectId(user.id),
          },
        },
      )
      .exec();
    await this.requestModel
      .updateOne(
        {
          _id: request._id,
          paymentStatus: PropertyPaymentStatus.Reported,
        },
        { $set: { paymentStatus: PropertyPaymentStatus.Paid } },
      )
      .exec();
    return this.findPayment(payment._id, user);
  }

  private findPayment(id: Types.ObjectId, user: AuthenticatedUser) {
    return this.paymentModel
      .findOne({ _id: id, ...this.scope(user) })
      .populate('request', 'listingType status paymentStatus')
      .populate('property', 'title city country')
      .populate('client', 'firstName lastName email')
      .populate('agent', 'firstName lastName email phone')
      .exec();
  }

  private scope(user: AuthenticatedUser) {
    if (user.role === UserRole.Admin) return {};
    if (user.role === UserRole.Agent) {
      if (!user.agentId) {
        throw new ForbiddenException(
          'This account has no assigned agent profile',
        );
      }
      return { agent: new Types.ObjectId(user.agentId) };
    }
    return { client: new Types.ObjectId(user.id) };
  }
}
