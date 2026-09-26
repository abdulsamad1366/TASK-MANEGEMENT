import { io, Socket } from 'socket.io-client';

const getSocketUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window !== 'undefined') {
    if (envUrl && envUrl.includes('localhost') && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `http://${window.location.hostname}:5001`;
    }
    if (envUrl) {
      return envUrl;
    }
    return `http://${window.location.hostname}:5001`;
  }
  return envUrl || 'http://localhost:5001';
};

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket && typeof window !== 'undefined') {
    const token = localStorage.getItem('task_access_token');
    const socketUrl = getSocketUrl();

    socket = io(socketUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✓ Connected to real-time server:', socket?.id);
    });

    socket.on('disconnect', (reason: any) => {
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
