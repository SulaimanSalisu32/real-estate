import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser, Roles } from './auth.decorators';
import { UserRole } from './auth.types';
import type { AuthenticatedUser } from './auth.types';
import { CreateAgentAccountDto } from './dto/create-agent-account.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('signup')
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.signUp(dto);
    this.setSessionCookie(response, session.accessToken);
    return { user: session.user };
  }

  @Post('signin')
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.signIn(dto);
    this.setSessionCookie(response, session.accessToken);
    return { user: session.user };
  }

  @Post('signout')
  signOut(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('haven_session', {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV') === 'production',
      path: '/',
    });
    return { signedOut: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  @Post('agent-accounts')
  @UseGuards(AuthGuard)
  @Roles(UserRole.Admin)
  createAgentAccount(@Body() dto: CreateAgentAccountDto) {
    return this.authService.createAgentAccount(dto);
  }

  private setSessionCookie(response: Response, token: string) {
    response.cookie('haven_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV') === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
