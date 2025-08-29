// Server/src/types/auth.types.ts

/** App roles mirrored in JWTs */
export type Role = 'classic' | 'admin';

/** Minimal JWT payload we expect from verifyJwt() */
export interface UserJwtPayload {
  id: number;            // internal user id
  role?: Role;           // 'classic' | 'admin'
  groupId?: number;      // primary group this user belongs to

  // optional commonly present fields (safe to keep optional)
  email?: string;
  name?: string;

  // standard JWT claims (optional because not all tokens include them)
  iat?: number;
  exp?: number;
}
