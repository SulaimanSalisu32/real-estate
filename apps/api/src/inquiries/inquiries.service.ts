import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthenticatedUser, UserRole } from '../auth/auth.types';
import { PropertiesService } from '../properties/properties.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { Inquiry, InquiryDocument } from './schemas/inquiry.schema';

@Injectable()
export class InquiriesService {
  constructor(
    @InjectModel(Inquiry.name)
    private readonly inquiryModel: Model<InquiryDocument>,
    private readonly propertiesService: PropertiesService,
  ) {}

  async create(dto: CreateInquiryDto) {
    const property = await this.propertiesService.findOne(dto.property);
    return this.inquiryModel.create({
      property: property._id,
      agent: property.agent._id,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      message: dto.message,
    });
  }

  findAll(user: AuthenticatedUser) {
    return this.inquiryModel
      .find(this.scope(user))
      .populate('property', 'title type city country price currency')
      .populate('agent', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const inquiry = await this.inquiryModel
      .findOne({ _id: id, ...this.scope(user) })
      .populate('property', 'title type city country price currency')
      .populate('agent', 'firstName lastName email phone')
      .exec();
    if (!inquiry) {
      throw new NotFoundException(`Inquiry "${id}" was not found`);
    }
    return inquiry;
  }

  async update(id: string, dto: UpdateInquiryDto, user: AuthenticatedUser) {
    const inquiry = await this.inquiryModel
      .findOneAndUpdate(
        { _id: id, ...this.scope(user) },
        dto,
        { new: true, runValidators: true },
      )
      .populate('property', 'title type city country price currency')
      .populate('agent', 'firstName lastName email phone')
      .exec();
    if (!inquiry) {
      throw new NotFoundException(`Inquiry "${id}" was not found`);
    }
    return inquiry;
  }

  async remove(id: string, user: AuthenticatedUser) {
    const inquiry = await this.inquiryModel
      .findOneAndDelete({ _id: id, ...this.scope(user) })
      .exec();
    if (!inquiry) {
      throw new NotFoundException(`Inquiry "${id}" was not found`);
    }
    return { deleted: true };
  }

  private scope(user: AuthenticatedUser) {
    if (user.role === UserRole.Admin) return {};
    if (!user.agentId) {
      throw new ForbiddenException('This account has no assigned agent profile');
    }
    return { agent: new Types.ObjectId(user.agentId) };
  }
}
