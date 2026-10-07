import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { Agent, AgentDocument } from './schemas/agent.schema';

@Injectable()
export class AgentsService {
  constructor(
    @InjectModel(Agent.name) private readonly agentModel: Model<AgentDocument>,
  ) {}

  create(dto: CreateAgentDto) {
    return this.agentModel.create(dto);
  }

  findAll() {
    return this.agentModel.find().sort({ lastName: 1, firstName: 1 }).exec();
  }

  async findOne(id: string) {
    const agent = await this.agentModel.findById(id).exec();
    if (!agent) {
      throw new NotFoundException(`Agent "${id}" was not found`);
    }
    return agent;
  }

  async update(id: string, dto: UpdateAgentDto) {
    const agent = await this.agentModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .exec();
    if (!agent) {
      throw new NotFoundException(`Agent "${id}" was not found`);
    }
    return agent;
  }

  async remove(id: string) {
    const agent = await this.agentModel.findByIdAndDelete(id).exec();
    if (!agent) {
      throw new NotFoundException(`Agent "${id}" was not found`);
    }
    return { deleted: true };
  }
}
