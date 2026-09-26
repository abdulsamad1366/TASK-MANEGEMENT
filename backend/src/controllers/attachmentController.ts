import { Request, Response } from 'express';
import prisma from '../config/db';
import { processUploadedFile } from '../services/storage';
import { emitToProject, emitToTask } from '../services/socket';

// Standalone media upload (used in chat, task creation modal, or anywhere)
export const uploadMedia = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const processed = await processUploadedFile(file);
    const isImage = processed.fileType.startsWith('image/');

    return res.status(200).json({
      fileUrl: processed.fileUrl,
      fileName: processed.fileName,
      fileSize: processed.fileSize,
      fileType: processed.fileType,
      isImage,
    });
  } catch (error) {
    console.error('uploadMedia error:', error);
    return res.status(500).json({ error: 'Failed to upload media file' });
  }
};

export const uploadAttachment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { taskId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        list: { select: { projectId: true } },
      },
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const processed = await processUploadedFile(file);
    const isImage = processed.fileType.startsWith('image/');

    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        uploadedById: req.user.id,
        fileName: processed.fileName,
        fileUrl: processed.fileUrl,
        fileType: processed.fileType,
        fileSize: processed.fileSize,
        isImage,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        taskId,
        userId: req.user.id,
        action: 'ATTACHMENT_ADDED',
        details: JSON.stringify({ fileName: attachment.fileName, isImage }),
      },
    });

    emitToProject(task.list.projectId, 'attachment:created', { taskId, attachment });
    emitToTask(taskId, 'attachment:created', { taskId, attachment });

    return res.status(201).json({ attachment });
  } catch (error) {
    console.error('uploadAttachment error:', error);
    return res.status(500).json({ error: 'Failed to upload attachment' });
  }
};

export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { attachmentId } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: {
          select: {
            id: true,
            list: { select: { projectId: true } },
          },
        },
      },
    });

    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

    await prisma.attachment.delete({ where: { id: attachmentId } });

    emitToProject(attachment.task.list.projectId, 'attachment:deleted', {
      taskId: attachment.taskId,
      attachmentId,
    });
    emitToTask(attachment.taskId, 'attachment:deleted', {
      taskId: attachment.taskId,
      attachmentId,
    });

    return res.status(200).json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete attachment' });
  }
};
