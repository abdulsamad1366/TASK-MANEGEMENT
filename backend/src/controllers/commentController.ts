import { Request, Response } from 'express';
import prisma from '../config/db';
import { emitToProject, emitToUser } from '../services/socket';

export const createComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { taskId } = req.params;
    const { content, imageUrl } = req.body;

    if ((!content || !content.trim()) && !imageUrl) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        list: {
          include: {
            project: { select: { id: true, key: true, space: { select: { workspaceId: true } } } },
          },
        },
        assignees: true,
      },
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const comment = await prisma.comment.create({
      data: {
        taskId,
        userId: req.user.id,
        content: content?.trim() || '',
        imageUrl: imageUrl || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Record activity
    await prisma.activityLog.create({
      data: {
        taskId,
        userId: req.user.id,
        action: 'COMMENT_ADDED',
        details: JSON.stringify({ snippet: content.slice(0, 100) }),
      },
    });

    // Detect @mentions in comment text (e.g., @name or @email)
    const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
    const matches = content?.match(mentionRegex);

    const projectKey = task.list.project.key;
    const projectId = task.list.project.id;
    const workspaceId = task.list.project.space.workspaceId;

    if (matches && matches.length > 0) {
      const namesOrUsernames = matches.map((m: string) => m.substring(1).toLowerCase());

      const workspaceUsers = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: true },
      });

      for (const member of workspaceUsers) {
        const u = member.user;
        const firstName = u.name.split(' ')[0].toLowerCase();
        const full = u.name.toLowerCase().replace(/\s+/g, '');
        const emailPrefix = u.email.split('@')[0].toLowerCase();

        const isMentioned = namesOrUsernames.some(
          (term: string) => term === firstName || term === full || term === emailPrefix
        );

        if (isMentioned && u.id !== req.user.id) {
          const notif = await prisma.notification.create({
            data: {
              userId: u.id,
              actorId: req.user.id,
              type: 'MENTION',
              title: `Mentioned in ${projectKey}-${task.taskNumber}`,
              message: `${req.user.name} mentioned you in chat: "${content.slice(0, 80)}"`,
              entityType: 'TASK',
              entityId: taskId,
            },
          });
          emitToUser(u.id, 'notification:received', notif);
        }
      }
    }

    // Notify task assignees if someone else commented
    for (const assignee of task.assignees) {
      if (assignee.userId !== req.user.id) {
        const notif = await prisma.notification.create({
          data: {
            userId: assignee.userId,
            actorId: req.user.id,
            type: 'CHAT',
            title: `New chat message on ${projectKey}-${task.taskNumber}`,
            message: `${req.user.name}: "${(content || 'Shared an image').slice(0, 80)}"`,
            entityType: 'TASK',
            entityId: taskId,
          },
        });
        emitToUser(assignee.userId, 'notification:received', notif);
      }
    }

    // Broadcast live to task room and project room
    const { emitToTask } = await import('../services/socket');
    emitToTask(taskId, 'chat:message', { taskId, comment });
    emitToProject(projectId, 'comment:created', { taskId, comment });

    return res.status(201).json({ comment });
  } catch (error) {
    console.error('createComment error:', error);
    return res.status(500).json({ error: 'Failed to create comment' });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          select: {
            list: { select: { projectId: true } },
          },
        },
      },
    });

    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    // Only comment creator or workspace Admin can delete
    if (comment.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not allowed to delete this comment' });
    }

    await prisma.comment.delete({ where: { id: commentId } });

    const projectId = (comment as any).task?.list?.projectId;
    if (projectId) {
      emitToProject(projectId, 'comment:deleted', {
        taskId: comment.taskId,
        commentId,
      });
    }

    return res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('deleteComment error:', error);
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
};
