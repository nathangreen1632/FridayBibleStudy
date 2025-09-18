export type Role = 'classic' | 'admin';

export interface UserJwtPayload {
  id: number;
  role?: Role;
  groupId?: number;
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
}
