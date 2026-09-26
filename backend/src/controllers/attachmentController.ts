import { Request, Response } from 'express';
import prisma from '../config/db';
import { processUploadedFile } from '../services/storage';
import { emitToProject } from '../services/socket';

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
      select: { id: true, projectId: true },
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const processed = await processUploadedFile(file);

    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        uploadedById: req.user.id,
        fileName: processed.fileName,
        fileUrl: processed.fileUrl,
        fileType: processed.fileType,
        fileSize: processed.fileSize,
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
        details: JSON.stringify({ fileName: attachment.fileName }),
      },
    });

    emitToProject(task.projectId, 'attachment:created', { taskId, attachment });
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
        task: { select: { projectId: true } },
      },
    });

    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

    await prisma.attachment.delete({ where: { id: attachmentId } });

    emitToProject(attachment.task.projectId, 'attachment:deleted', {
      taskId: attachment.taskId,
      attachmentId,
    });

    return res.status(200).json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete attachment' });
  }
};
