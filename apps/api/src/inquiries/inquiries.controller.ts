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
import { UserRole } from '../auth/auth.types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { RolesGuard } from '../auth/roles.guard';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { InquiriesService } from './inquiries.service';

class InquiryIdParam {
  @IsMongoId()
  id: string;
}

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  create(@Body() dto: CreateInquiryDto) {
    return this.inquiriesService.create(dto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.Agent, UserRole.Admin)
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.inquiriesService.findAll(user);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.Agent, UserRole.Admin)
  findOne(
    @Param() params: InquiryIdParam,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inquiriesService.findOne(params.id, user);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.Agent, UserRole.Admin)
  update(
    @Param() params: InquiryIdParam,
    @Body() dto: UpdateInquiryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inquiriesService.update(params.id, dto, user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.Agent, UserRole.Admin)
  remove(
    @Param() params: InquiryIdParam,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inquiriesService.remove(params.id, user);
  }
}
