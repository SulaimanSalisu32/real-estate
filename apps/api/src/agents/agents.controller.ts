import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsMongoId } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/auth.decorators';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../auth/auth.types';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

class AgentIdParam {
  @IsMongoId()
  id: string;
}

@Controller('agents')
// agents controller
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  create(@Body() dto: CreateAgentDto) {
    return this.agentsService.create(dto);
  }

  @Get()
  findAll() {
    return this.agentsService.findAll();
  }

  @Get(':id')
  findOne(@Param() params: AgentIdParam) {
    return this.agentsService.findOne(params.id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  update(@Param() params: AgentIdParam, @Body() dto: UpdateAgentDto) {
    return this.agentsService.update(params.id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  remove(@Param() params: AgentIdParam) {
    return this.agentsService.remove(params.id);
  }
}
