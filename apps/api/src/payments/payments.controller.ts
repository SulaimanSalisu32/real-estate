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
import { ReportPaymentDto } from './dto/report-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentsService } from './payments.service';

class PaymentIdParam {
  @IsMongoId()
  id: string;
}

class PaymentRequestIdParam {
  @IsMongoId()
  requestId: string;
}

@Controller('payments')
@UseGuards(AuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('report/:requestId')
  @Roles(UserRole.Client)
  reportPayment(
    @Param() params: PaymentRequestIdParam,
    @Body() dto: ReportPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.reportPayment(params.requestId, dto, user);
  }

  @Get()
  @Roles(UserRole.Client, UserRole.Agent, UserRole.Admin)
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.findMine(user);
  }

  @Patch(':id')
  @Roles(UserRole.Agent, UserRole.Admin)
  update(
    @Param() params: PaymentIdParam,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.update(params.id, dto, user);
  }
}
