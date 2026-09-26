import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    },
  });

  // Authentication handshake for sockets
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        (socket as any).userId = payload.userId;
      } catch (err) {
        // Allow unauthenticated connection or reject if strict
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on('join:project', (projectId: string) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
      }
    });

    socket.on('leave:project', (projectId: string) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    // In-Task Real-Time Chat Room
    socket.on('join:task', (taskId: string) => {
      if (taskId) {
        socket.join(`task:${taskId}`);
      }
    });

    socket.on('leave:task', (taskId: string) => {
      if (taskId) {
        socket.leave(`task:${taskId}`);
      }
    });

    socket.on('join:workspace', (workspaceId: string) => {
      if (workspaceId) {
        socket.join(`workspace:${workspaceId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean up connection
    });
  });

  console.log('✓ Socket.io initialized');
  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};

export const emitToTask = (taskId: string, event: string, data: any) => {
  if (io) {
    io.to(`task:${taskId}`).emit(event, data);
  }
};

export const emitToProject = (projectId: string, event: string, data: any) => {
  if (io) {
    io.to(`project:${projectId}`).emit(event, data);
  }
};

export const emitToWorkspace = (workspaceId: string, event: string, data: any) => {
  if (io) {
    io.to(`workspace:${workspaceId}`).emit(event, data);
  }
};

export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};
