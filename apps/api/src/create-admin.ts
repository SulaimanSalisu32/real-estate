import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { hash } from 'bcryptjs';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import { UserRole } from './auth/auth.types';
import { User, UserDocument } from './auth/schemas/user.schema';

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const firstName = process.env.ADMIN_FIRST_NAME?.trim();
  const lastName = process.env.ADMIN_LAST_NAME?.trim();
  const missing = [
    !email && 'ADMIN_EMAIL',
    !firstName && 'ADMIN_FIRST_NAME',
    !lastName && 'ADMIN_LAST_NAME',
    !password && 'ADMIN_PASSWORD',
  ].filter((name): name is string => Boolean(name));
  if (!email || !firstName || !lastName || !password) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`,
    );
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long.');
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const users = app.get<Model<UserDocument>>(getModelToken(User.name));
    const existing = await users.findOne({ email }).exec();
    if (existing && existing.role !== UserRole.Admin) {
      throw new Error('That email is already assigned to a non-admin account.');
    }
    await users.updateOne(
      { email, role: UserRole.Admin },
      {
        $set: {
          firstName,
          lastName,
          passwordHash: await hash(password, 12),
          role: UserRole.Admin,
        },
      },
      { upsert: true },
    );
    console.log(`Admin account is ready for ${email}.`);
  } finally {
    await app.close();
  }
}

void createAdmin().catch((error: unknown) => {
  console.error('Failed to create the admin account:', error);
  process.exitCode = 1;
});
