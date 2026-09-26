import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket && typeof window !== 'undefined') {
    const token = localStorage.getItem('task_access_token');

    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✓ Connected to real-time server:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Real-time server disconnected:', reason);
    });
  }

  return socket!;
};

export const joinProjectRoom = (projectId: string) => {
  const s = getSocket();
  if (s) {
    s.emit('join:project', projectId);
  }
};

export const leaveProjectRoom = (projectId: string) => {
  const s = getSocket();
  if (s) {
    s.emit('leave:project', projectId);
  }
};

export const joinWorkspaceRoom = (workspaceId: string) => {
  const s = getSocket();
  if (s) {
    s.emit('join:workspace', workspaceId);
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
