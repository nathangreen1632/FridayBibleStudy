import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io({
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    timeout: 10_000,
  });

  return socket;
}
