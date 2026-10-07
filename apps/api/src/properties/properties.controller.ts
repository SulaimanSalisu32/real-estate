import {
  BadRequestException,
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
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../auth/auth.types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertiesService } from './properties.service';

class PropertyIdParam {
  @IsMongoId()
  id: string;
}

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.Agent, UserRole.Admin)
  create(
    @Body() dto: CreatePropertyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role === UserRole.Admin && !dto.agent) {
      throw new BadRequestException('An agent must be assigned to the listing');
    }
    const property = Object.assign(new CreatePropertyDto(), dto, {
      agent: user.role === UserRole.Agent ? user.agentId! : dto.agent,
    });
    return this.propertiesService.create(property);
  }

  @Get()
  findAll() {
    return this.propertiesService.findAll();
  }

  @Get(':id')
  findOne(@Param() params: PropertyIdParam) {
    return this.propertiesService.findOne(params.id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.Agent, UserRole.Admin)
  update(
    @Param() params: PropertyIdParam,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.propertiesService.update(params.id, dto, user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.Agent, UserRole.Admin)
  remove(
    @Param() params: PropertyIdParam,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.propertiesService.remove(params.id, user);
  }
}
