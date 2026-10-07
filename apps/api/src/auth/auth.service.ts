import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Model } from 'mongoose';
import { Agent, AgentDocument } from '../agents/schemas/agent.schema';
import { CreateAgentAccountDto } from './dto/create-agent-account.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { UserRole } from './auth.types';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Agent.name) private readonly agentModel: Model<AgentDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(dto: SignUpDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.userModel.exists({ email })) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.userModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email,
      passwordHash: await hash(dto.password, 12),
      role: UserRole.Client,
    });
    return this.createSession(user);
  }

  async signIn(dto: SignInDto) {
    const user = await this.userModel
      .findOne({ email: dto.email.trim().toLowerCase() })
      .select('+passwordHash')
      .exec();
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    return this.createSession(user);
  }

  async createAgentAccount(dto: CreateAgentAccountDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.userModel.exists({ email })) {
      throw new ConflictException('An account with this email already exists');
    }

    let agent = await this.agentModel.findOne({ email }).exec();
    const createdAgent = !agent;
    if (agent) {
      agent.firstName = dto.firstName;
      agent.lastName = dto.lastName;
      agent.phone = dto.phone;
      agent.agency = dto.agency;
      await agent.save();
    } else {
      agent = await this.agentModel.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email,
        phone: dto.phone,
        agency: dto.agency,
      });
    }

    try {
      await this.userModel.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email,
        passwordHash: await hash(dto.password, 12),
        role: UserRole.Agent,
        agent: agent._id,
      });
    } catch (error) {
      if (createdAgent) {
        await this.agentModel.findByIdAndDelete(agent._id).exec();
      }
      throw error;
    }

    return { created: true, email, role: UserRole.Agent };
  }

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-passwordHash')
      .populate('agent', 'firstName lastName email phone agency')
      .exec();
    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }
    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      agent: user.agent,
    };
  }

  private async createSession(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      ...(user.agent ? { agentId: user.agent.toString() } : {}),
    };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: payload.sub,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}
