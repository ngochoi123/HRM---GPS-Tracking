import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/config/env';

let socket: Socket | null = null;

export function getGeofenceSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      autoConnect: false,
    });
  }
  return socket;
}

export function disconnectGeofenceSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
