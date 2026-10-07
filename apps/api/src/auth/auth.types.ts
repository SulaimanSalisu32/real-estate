export enum UserRole {
  Client = 'client',
  Agent = 'agent',
  Admin = 'admin',
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  agentId?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  agentId?: string;
}
