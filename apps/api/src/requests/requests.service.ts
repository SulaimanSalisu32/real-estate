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
import { CreatePropertyRequestDto } from './dto/create-property-request.dto';
import { UpdatePropertyRequestDto } from './dto/update-property-request.dto';
import {
  PropertyRequest,
  PropertyRequestDocument,
  PropertyPaymentStatus,
  PropertyRequestStatus,
} from './schemas/property-request.schema';

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(PropertyRequest.name)
    private readonly requestModel: Model<PropertyRequestDocument>,
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  async create(dto: CreatePropertyRequestDto, user: AuthenticatedUser) {
    const property = await this.propertyModel.findById(dto.property).exec();
    if (!property) {
      throw new NotFoundException(`Property "${dto.property}" was not found`);
    }
    if (property.status !== PropertyStatus.Available) {
      throw new ConflictException('This property is no longer available');
    }
    if (!property.agent) {
      throw new ConflictException('This property has no assigned agent');
    }

    const request = await this.requestModel.create({
      property: property._id,
      agent: property.agent,
      client: new Types.ObjectId(user.id),
      listingType: property.listingType,
      phone: dto.phone,
      message: dto.message,
    });
    return this.populate(request._id);
  }

  findAll(user: AuthenticatedUser) {
    return this.requestModel
      .find(this.scope(user))
      .populate('property', 'title type city country price currency status')
      .populate('agent', 'firstName lastName email phone')
      .populate('client', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(
    id: string,
    dto: UpdatePropertyRequestDto,
    user: AuthenticatedUser,
  ) {
    const request = await this.requestModel
      .findOne({ _id: id, ...this.scope(user) })
      .exec();
    if (!request) {
      throw new NotFoundException(`Request "${id}" was not found`);
    }
    if (
      request.status === PropertyRequestStatus.Declined ||
      request.status === PropertyRequestStatus.Approving
    ) {
      throw new ConflictException('This request has already been resolved');
    }

    if (request.status === PropertyRequestStatus.Approved) {
      if (
        dto.status !== PropertyRequestStatus.Declined ||
        ![
          PropertyPaymentStatus.Unpaid,
          PropertyPaymentStatus.Pending,
          PropertyPaymentStatus.CheckoutPending,
        ].includes(request.paymentStatus)
      ) {
        throw new ConflictException(
          'An approved request can only be declined before payment is reported',
        );
      }
      const declined = await this.requestModel
        .findOneAndUpdate(
          {
            _id: request._id,
            status: PropertyRequestStatus.Approved,
            paymentStatus: {
              $in: [
                PropertyPaymentStatus.Unpaid,
                PropertyPaymentStatus.Pending,
                PropertyPaymentStatus.CheckoutPending,
              ],
            },
          },
          { $set: { status: PropertyRequestStatus.Declined } },
          { returnDocument: 'after', runValidators: true },
        )
        .exec();
      if (!declined) {
        throw new ConflictException('This request was updated by another user');
      }
      await this.propertyModel
        .updateOne(
          {
            _id: request.property,
            status: PropertyStatus.Reserved,
          },
          { $set: { status: PropertyStatus.Available } },
        )
        .exec();
      return this.populate(declined._id);
    }

    if (dto.status === PropertyRequestStatus.Approved) {
      const lockedRequest = await this.requestModel
        .findOneAndUpdate(
          {
            _id: request._id,
            status: {
              $in: [PropertyRequestStatus.New, PropertyRequestStatus.Contacted],
            },
          },
          { $set: { status: PropertyRequestStatus.Approving } },
          { returnDocument: 'after' },
        )
        .exec();
      if (!lockedRequest) {
        throw new ConflictException('This request was updated by another user');
      }

      const claimedProperty = await this.propertyModel
        .findOneAndUpdate(
          {
            _id: request.property,
            status: PropertyStatus.Available,
          },
          { $set: { status: PropertyStatus.Reserved } },
          { returnDocument: 'after' },
        )
        .exec();
      if (!claimedProperty) {
        await this.requestModel
          .updateOne(
            {
              _id: request._id,
              status: PropertyRequestStatus.Approving,
            },
            { $set: { status: request.status } },
          )
          .exec();
        throw new ConflictException(
          'The property is no longer available to approve',
        );
      }
      const approved = await this.requestModel
        .findOneAndUpdate(
          {
            _id: request._id,
            status: PropertyRequestStatus.Approving,
          },
          {
            $set: {
              status: PropertyRequestStatus.Approved,
              approvedAmount: claimedProperty.price,
              approvedCurrency: claimedProperty.currency,
            },
          },
          { returnDocument: 'after', runValidators: true },
        )
        .exec();
      if (!approved) {
        throw new ConflictException('The request could not be finalized');
      }
      return this.populate(approved._id);
    }

    const updated = await this.requestModel
      .findOneAndUpdate(
        {
          _id: request._id,
          status: {
            $in: [PropertyRequestStatus.New, PropertyRequestStatus.Contacted],
          },
        },
        { $set: { status: dto.status } },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
    if (!updated) {
      throw new ConflictException('This request was updated by another user');
    }
    return this.populate(updated._id);
  }

  private async populate(id: Types.ObjectId) {
    const request = await this.requestModel
      .findById(id)
      .populate('property', 'title type city country price currency status')
      .populate('agent', 'firstName lastName email phone')
      .populate('client', 'firstName lastName email')
      .exec();
    if (!request) {
      throw new NotFoundException('The request could not be loaded');
    }
    return request;
  }

  private scope(user: AuthenticatedUser) {
    if (user.role === UserRole.Admin) return {};
    if (user.role === UserRole.Agent) {
      if (!user.agentId) {
        throw new ForbiddenException('This account has no assigned agent profile');
      }
      return { agent: new Types.ObjectId(user.agentId) };
    }
    return { client: new Types.ObjectId(user.id) };
  }
}
