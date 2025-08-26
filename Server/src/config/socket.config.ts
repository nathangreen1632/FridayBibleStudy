import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

let io: Server;

export function initSocket(server: HttpServer): void {
  io = new Server(server, {
    cors: { origin: false } // same-origin; we serve client via Express
  });

  io.on('connection', (socket) => {
    socket.on('join:group', (groupId: number) => {
      socket.join(`group:${groupId}`);
    });
  });
}

export function emitToGroup(groupId: number, event: string, payload: unknown): void {
  io.to(`group:${groupId}`).emit(event, payload);
}
