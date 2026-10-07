import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsMongoId } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { UserRole } from '../auth/auth.types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RolesGuard } from '../auth/roles.guard';
import { CreatePropertyRequestDto } from './dto/create-property-request.dto';
import { UpdatePropertyRequestDto } from './dto/update-property-request.dto';
import { RequestsService } from './requests.service';

class RequestIdParam {
  @IsMongoId()
  id: string;
}

@Controller('requests')
@UseGuards(AuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @Roles(UserRole.Client)
  create(
    @Body() dto: CreatePropertyRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requestsService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.Client, UserRole.Agent, UserRole.Admin)
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.requestsService.findAll(user);
  }

  @Patch(':id')
  @Roles(UserRole.Agent, UserRole.Admin)
  update(
    @Param() params: RequestIdParam,
    @Body() dto: UpdatePropertyRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requestsService.update(params.id, dto, user);
  }
}
