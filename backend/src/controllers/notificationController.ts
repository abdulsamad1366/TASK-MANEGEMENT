import { Request, Response } from 'express';
import prisma from '../config/db';

export const listNotifications = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        actor: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    return res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    console.error('listNotifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const notification = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    });

    return res.status(200).json({ message: 'Notification marked as read', count: notification.count });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

export const clearNotifications = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.notification.deleteMany({
      where: { userId: req.user.id },
    });

    return res.status(200).json({ message: 'All notifications cleared' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to clear notifications' });
  }
};
