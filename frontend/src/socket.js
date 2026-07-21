import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

let socket = null;

export function getSocket() {
  const token = localStorage.getItem('jambo_token');
  if (!socket) {
    socket = io(BACKEND_URL, {
      auth: { token: token || '' },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  } else if (!socket.connected) {
    // Reconnect with auth if was disconnected (e.g. after logout/login cycle)
    socket.auth = { token: token || '' };
    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
