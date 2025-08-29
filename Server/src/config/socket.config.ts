// Server/src/config/socket.config.ts
import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import cookie from 'cookie';
import { verifyJwt } from '../utils/jwt.util.js';
import {UserJwtPayload} from "../types/auth.types.js";

type MaybeUserish = {
  id?: unknown;
  userId?: unknown;
  sub?: unknown;
  role?: unknown;
  groupId?: unknown;
  email?: unknown;
  name?: unknown;
  iat?: unknown;
  exp?: unknown;
};

/** Accepts whatever verifyJwt() returns and maps it into your UserJwtPayload shape */
function coerceToUserJwtPayload(x: unknown): UserJwtPayload | null {
  const u = x as MaybeUserish | null | undefined;
  if (!u) return null;

  // derive a numeric id from id | userId | sub
  let id: number | null = null;
  if (typeof u.id === 'number') id = u.id;
  else if (typeof u.userId === 'number') id = u.userId;
  else if (typeof u.sub === 'string' && /^\d+$/.test(u.sub)) id = Number(u.sub);

  if (id == null) return null; // cannot attach rooms without a user id

  const role =
    u.role === 'admin' || u.role === 'classic' ? (u.role) : undefined;

  const groupId = typeof u.groupId === 'number' ? u.groupId : undefined;

  return {
    id,
    role,
    groupId,
    email: typeof u.email === 'string' ? u.email : undefined,
    name: typeof u.name === 'string' ? u.name : undefined,
    iat: typeof u.iat === 'number' ? u.iat : undefined,
    exp: typeof u.exp === 'number' ? u.exp : undefined,
  };
}


export type SocketUser = { id: number; role?: 'admin' | 'classic'; groupId?: number };

let io: Server | null = null;

export function initSocket(server: HttpServer): void {
  // Same-origin via dev proxy; no CORS options needed.
  io = new Server(server, {
    connectTimeout: 10_000,
  });

  // Server/src/config/socket.config.ts  (replace ONLY the io.use(...) block with this)
  io.use((socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie || '';
      const cookies = cookie.parse(rawCookie);
      const bearer = socket.handshake.auth?.token as string | undefined;
      const jwt = cookies?.token ?? bearer;
      if (!jwt) return next(); // allow anonymous sockets too

      // decode without assuming the exact return type
      const decoded = verifyJwt(jwt) as unknown;
      const payload = coerceToUserJwtPayload(decoded);
      if (!payload) return next(); // token present but not usable for rooms

      (socket.data as { user?: SocketUser }).user = {
        id: payload.id,
        role: (payload.role as 'admin' | 'classic') || 'classic',
        groupId: payload.groupId,
      };
      next();
    } catch {
      next();
    }
  });


  io.on('connection', (socket: Socket) => {
    const user = (socket.data as { user?: SocketUser }).user;

    // Default room joins (if known)
    if (user?.groupId) socket.join(roomGroup(user.groupId));
    if (user?.id) socket.join(roomUser(user.id));
    if (user?.role === 'admin') socket.join(roomAdmins());

    // Explicit joins/leaves for dynamic group switches
    socket.on('join:group', (groupId: number) => socket.join(roomGroup(groupId)));
    socket.on('leave:group', (groupId: number) => socket.leave(roomGroup(groupId)));
  });
}

// Room helpers
export const roomGroup  = (groupId: number) => `group:${groupId}`;
export const roomUser   = (userId: number)  => `user:${userId}`;
export const roomAdmins = () => 'admins';

// Safe emit helpers (no-ops until initSocket runs)
function s() { return io; }

export function emitToGroup(groupId: number, event: string, payload: unknown): void {
  const srv = s(); if (!srv) return;
  srv.to(roomGroup(groupId)).emit(event, payload);
}

export function emitToUser(userId: number, event: string, payload: unknown): void {
  const srv = s(); if (!srv) return;
  srv.to(roomUser(userId)).emit(event, payload);
}

export function emitToAdmins(event: string, payload: unknown): void {
  const srv = s(); if (!srv) return;
  srv.to(roomAdmins()).emit(event, payload);
}
