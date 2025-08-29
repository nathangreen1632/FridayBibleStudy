// Client/src/lib/socket.ts
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  // same-origin: no URL required; your dev proxy forwards /socket.io to backend
  socket = io({
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    timeout: 10_000,
    // withCredentials not needed for same-origin cookie flow
  });
  return socket;
}
