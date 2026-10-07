import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AgentDocument } from '../agents/schemas/agent.schema';
import { AgentsService } from '../agents/agents.service';
import { UserRole } from '../auth/auth.types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import {
  Property,
  PropertyDocument,
  PropertyStatus,
} from './schemas/property.schema';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
    private readonly agentsService: AgentsService,
  ) {}

  async create(dto: CreatePropertyDto) {
    if (!dto.agent) {
      throw new BadRequestException('An agent must be assigned to the listing');
    }
    await this.agentsService.findOne(dto.agent);
    return this.propertyModel.create(dto);
  }

  findAll() {
    return this.propertyModel
      .find()
      .populate('agent', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const property = await this.propertyModel
      .findById(id)
      .populate<{ agent: AgentDocument }>(
        'agent',
        'firstName lastName email phone',
      )
      .exec();
    if (!property) {
      throw new NotFoundException(`Property "${id}" was not found`);
    }
    return property;
  }

  async update(
    id: string,
    dto: UpdatePropertyDto,
    user: AuthenticatedUser,
  ) {
    if (user.role === UserRole.Admin && dto.agent) {
      await this.agentsService.findOne(dto.agent);
    }
    const scope = this.scope(user);
    const current = await this.propertyModel
      .findOne({ _id: id, ...scope })
      .exec();
    if (!current) {
      throw new NotFoundException(`Property "${id}" was not found`);
    }
    if (
      current.status === PropertyStatus.Reserved &&
      dto.status &&
      dto.status !== PropertyStatus.Reserved
    ) {
      throw new ConflictException(
        'A reserved property status is managed through its purchase or rental request',
      );
    }
    const update =
      user.role === UserRole.Agent
        ? Object.assign(new UpdatePropertyDto(), dto, { agent: user.agentId })
        : dto;
    const property = await this.propertyModel
      .findOneAndUpdate(
        { _id: id, ...scope },
        update,
        { new: true, runValidators: true },
      )
      .populate('agent', 'firstName lastName email phone')
      .exec();
    if (!property) {
      throw new NotFoundException(`Property "${id}" was not found`);
    }
    return property;
  }

  async remove(id: string, user: AuthenticatedUser) {
    const current = await this.propertyModel
      .findOne({ _id: id, ...this.scope(user) })
      .exec();
    if (!current) {
      throw new NotFoundException(`Property "${id}" was not found`);
    }
    if (current.status === PropertyStatus.Reserved) {
      throw new ConflictException(
        'A reserved property cannot be deleted while a payment is being settled',
      );
    }
    await this.propertyModel.deleteOne({ _id: id }).exec();
    return { deleted: true };
  }

  private scope(user: AuthenticatedUser) {
    if (user.role === UserRole.Admin) return {};
    if (!user.agentId) {
      throw new ForbiddenException('This account has no assigned agent profile');
    }
    return { agent: user.agentId };
  }
}
