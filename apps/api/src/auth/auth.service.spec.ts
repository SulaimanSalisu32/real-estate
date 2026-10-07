import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { Types } from 'mongoose';
import { Agent } from '../agents/schemas/agent.schema';
import { AuthService } from './auth.service';
import { UserRole } from './auth.types';
import { User } from './schemas/user.schema';

describe('AuthService', () => {
  let service: AuthService;
  const userModel = {
    exists: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };
  const agentModel = {
    exists: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-session'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Agent.name), useValue: agentModel },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('creates only client accounts and stores a password hash', async () => {
    userModel.exists.mockResolvedValue(null);
    userModel.create.mockImplementation((values: Record<string, unknown>) =>
      Promise.resolve({
        _id: new Types.ObjectId('64b000000000000000000001'),
        ...values,
      }),
    );

    const session = await service.signUp({
      firstName: 'Casey',
      lastName: 'Client',
      email: ' CASEY@example.com ',
      password: 'correct-horse-123',
    });

    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'casey@example.com',
        role: UserRole.Client,
      }),
    );
    const passwordHash = userModel.create.mock.calls[0][0].passwordHash;
    expect(passwordHash).not.toBe('correct-horse-123');
    await expect(compare('correct-horse-123', passwordHash)).resolves.toBe(true);
    expect(session.accessToken).toBe('signed-session');
    expect(session.user.role).toBe(UserRole.Client);
  });

  it('rejects duplicate account emails', async () => {
    userModel.exists.mockResolvedValue({ _id: new Types.ObjectId() });

    await expect(
      service.signUp({
        firstName: 'Casey',
        lastName: 'Client',
        email: 'casey@example.com',
        password: 'correct-horse-123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('rejects incorrect passwords with a generic sign-in error', async () => {
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      service.signIn({
        email: 'missing@example.com',
        password: 'correct-horse-123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
