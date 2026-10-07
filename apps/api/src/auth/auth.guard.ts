import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthenticatedUser, JwtPayload, UserRole } from './auth.types';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, bearerToken] = authorization?.split(' ') ?? [];
    const cookieToken = request.headers.cookie
      ?.split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith('haven_session='))
      ?.slice('haven_session='.length);
    const token =
      scheme === 'Bearer' && bearerToken ? bearerToken : cookieToken;
    if (!token) {
      throw new UnauthorizedException('A bearer access token is required');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('The access token is invalid or expired');
    }

    if (
      !payload.sub ||
      !Object.values(UserRole).includes(payload.role) ||
      !payload.email
    ) {
      throw new UnauthorizedException('The access token is invalid');
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      ...(payload.agentId ? { agentId: payload.agentId } : {}),
    };
    return true;
  }
}
