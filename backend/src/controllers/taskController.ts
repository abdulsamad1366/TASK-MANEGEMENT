import { Request, Response } from 'express';
import prisma from '../config/db';
import { emitToProject, emitToUser } from '../services/socket';

export const listTasks = async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      workspaceId,
      columnId,
      assigneeId,
      priority,
      search,
      label,
      dueDateFilter, // "overdue", "today", "this_week", "upcoming"
    } = req.query;

    const where: any = {};

    if (projectId) where.projectId = String(projectId);
    if (columnId) where.columnId = String(columnId);
    if (priority) where.priority = String(priority);

    if (workspaceId && !projectId) {
      where.project = { workspaceId: String(workspaceId) };
    }

    if (assigneeId) {
      where.assignees = {
        some: { userId: String(assigneeId) },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
    }

    if (label) {
      where.labels = { contains: String(label) };
    }

    const now = new Date();
    if (dueDateFilter === 'overdue') {
      where.dueDate = { lt: now };
      where.column = { isCompleted: false };
    } else if (dueDateFilter === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const endOfDay = new Date(now.setHours(23, 59, 59, 999));
      where.dueDate = { gte: startOfDay, lte: endOfDay };
    } else if (dueDateFilter === 'this_week') {
      const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.dueDate = { gte: now, lte: endOfWeek };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ columnId: 'asc' }, { order: 'asc' }],
      include: {
        project: {
          select: { id: true, name: true, key: true, color: true },
        },
        column: {
          select: { id: true, name: true, color: true, isCompleted: true },
        },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        subtasks: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { comments: true, attachments: true },
        },
      },
    });

    return res.status(200).json({ tasks });
  } catch (error) {
    console.error('listTasks error:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const getTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, key: true, color: true, workspaceId: true },
        },
        column: {
          select: { id: true, name: true, color: true, isCompleted: true },
        },
        creator: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        subtasks: {
          orderBy: { order: 'asc' },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
        blocking: {
          include: {
            dependsOnTask: {
              select: { id: true, title: true, taskNumber: true, priority: true, column: true },
            },
          },
        },
        blockedBy: {
          include: {
            task: {
              select: { id: true, title: true, taskNumber: true, priority: true, column: true },
            },
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.status(200).json({ task });
  } catch (error) {
    console.error('getTask error:', error);
    return res.status(500).json({ error: 'Failed to fetch task details' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      projectId,
      columnId,
      title,
      description,
      priority = 'MEDIUM',
      startDate,
      dueDate,
      labels = [],
      isRecurring = false,
      recurrenceRule = 'NONE',
      assigneeIds = [],
      subtasks = [],
    } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({ error: 'projectId and title are required' });
    }

    // Determine target column if not provided
    let targetColId = columnId;
    if (!targetColId) {
      const defaultCol = await prisma.boardColumn.findFirst({
        where: { projectId },
        orderBy: { order: 'asc' },
      });
      if (!defaultCol) {
        return res.status(400).json({ error: 'Project has no columns defined' });
      }
      targetColId = defaultCol.id;
    }

    // Determine sequential task number within project
    const lastTask = await prisma.task.findFirst({
      where: { projectId },
      orderBy: { taskNumber: 'desc' },
    });
    const taskNumber = (lastTask?.taskNumber || 100) + 1;

    // Determine order position in column
    const lastInCol = await prisma.task.findFirst({
      where: { columnId: targetColId },
      orderBy: { order: 'desc' },
    });
    const order = (lastInCol?.order || 0) + 1000;

    const task = await prisma.task.create({
      data: {
        projectId,
        columnId: targetColId,
        taskNumber,
        title,
        description,
        priority,
        order,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        labels: Array.isArray(labels) ? JSON.stringify(labels) : String(labels),
        isRecurring,
        recurrenceRule,
        creatorId: req.user.id,
        assignees: {
          create: (assigneeIds as string[]).map((userId) => ({ userId })),
        },
        subtasks: {
          create: (subtasks as { title: string }[]).map((s, idx) => ({
            title: s.title,
            order: idx,
          })),
        },
      },
      include: {
        project: {
          select: { id: true, name: true, key: true, color: true },
        },
        column: {
          select: { id: true, name: true, color: true, isCompleted: true },
        },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        subtasks: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Log creation activity
    await prisma.activityLog.create({
      data: {
        taskId: task.id,
        userId: req.user.id,
        action: 'CREATED',
        details: JSON.stringify({ title: task.title }),
      },
    });

    // Send notifications to assignees
    for (const assigneeId of assigneeIds) {
      if (assigneeId !== req.user.id) {
        const notif = await prisma.notification.create({
          data: {
            userId: assigneeId,
            actorId: req.user.id,
            type: 'ASSIGNMENT',
            title: 'Assigned to New Task',
            message: `${req.user.name} assigned you to ${task.project.key}-${task.taskNumber}: ${task.title}`,
            entityType: 'TASK',
            entityId: task.id,
          },
        });
        emitToUser(assigneeId, 'notification:received', notif);
      }
    }

    emitToProject(projectId, 'task:created', task);
    return res.status(201).json({ task });
  } catch (error) {
    console.error('createTask error:', error);
    return res.status(500).json({ error: 'Failed to create task' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignees: true,
        project: { select: { id: true, key: true } },
      },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const {
      title,
      description,
      priority,
      startDate,
      dueDate,
      labels,
      isRecurring,
      recurrenceRule,
      assigneeIds,
    } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (priority !== undefined) data.priority = priority;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (labels !== undefined) {
      data.labels = Array.isArray(labels) ? JSON.stringify(labels) : String(labels);
    }
    if (isRecurring !== undefined) data.isRecurring = isRecurring;
    if (recurrenceRule !== undefined) data.recurrenceRule = recurrenceRule;

    // Handle Assignees diff
    if (Array.isArray(assigneeIds)) {
      await prisma.taskAssignee.deleteMany({ where: { taskId: id } });
      if (assigneeIds.length > 0) {
        await prisma.taskAssignee.createMany({
          data: assigneeIds.map((userId: string) => ({ taskId: id, userId })),
        });
      }

      // Check newly assigned members to notify
      const existingUserIds = existingTask.assignees.map((a) => a.userId);
      const newlyAssigned = assigneeIds.filter(
        (userId: string) => !existingUserIds.includes(userId) && userId !== req.user?.id
      );

      for (const userId of newlyAssigned) {
        const notif = await prisma.notification.create({
          data: {
            userId,
            actorId: req.user.id,
            type: 'ASSIGNMENT',
            title: 'Assigned to Task',
            message: `${req.user.name} assigned you to ${existingTask.project.key}-${existingTask.taskNumber}: ${existingTask.title}`,
            entityType: 'TASK',
            entityId: id,
          },
        });
        emitToUser(userId, 'notification:received', notif);
      }
    }

    // Activity logging for priority change
    if (priority && priority !== existingTask.priority) {
      await prisma.activityLog.create({
        data: {
          taskId: id,
          userId: req.user.id,
          action: 'PRIORITY_CHANGE',
          details: JSON.stringify({ from: existingTask.priority, to: priority }),
        },
      });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data,
      include: {
        project: {
          select: { id: true, name: true, key: true, color: true },
        },
        column: {
          select: { id: true, name: true, color: true, isCompleted: true },
        },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        subtasks: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { comments: true, attachments: true },
        },
      },
    });

    emitToProject(updatedTask.projectId, 'task:updated', updatedTask);
    return res.status(200).json({ task: updatedTask });
  } catch (error) {
    console.error('updateTask error:', error);
    return res.status(500).json({ error: 'Failed to update task' });
  }
};

// Kanban Drag-and-Drop Move Endpoint
export const moveTask = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { columnId, order } = req.body;

    if (!columnId || order === undefined) {
      return res.status(400).json({ error: 'columnId and order are required' });
    }

    const currentTask = await prisma.task.findUnique({
      where: { id },
      include: {
        column: true,
      },
    });

    if (!currentTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const targetColumn = await prisma.boardColumn.findUnique({
      where: { id: columnId },
    });

    if (!targetColumn) {
      return res.status(404).json({ error: 'Target column not found' });
    }

    // Check if column status changed
    const statusChanged = currentTask.columnId !== columnId;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        columnId,
        order: Number(order),
      },
      include: {
        column: true,
        project: { select: { id: true, key: true } },
      },
    });

    if (statusChanged) {
      await prisma.activityLog.create({
        data: {
          taskId: id,
          userId: req.user.id,
          action: 'STATUS_CHANGE',
          details: JSON.stringify({
            from: currentTask.column.name,
            to: targetColumn.name,
          }),
        },
      });

      // If task was marked completed and is recurring, duplicate for next recurrence
      if (targetColumn.isCompleted && currentTask.isRecurring && currentTask.recurrenceRule !== 'NONE') {
        let nextDueDate: Date | null = null;
        const baseDate = currentTask.dueDate || new Date();

        if (currentTask.recurrenceRule === 'DAILY') {
          nextDueDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
        } else if (currentTask.recurrenceRule === 'WEEKLY') {
          nextDueDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else if (currentTask.recurrenceRule === 'MONTHLY') {
          nextDueDate = new Date(baseDate.setMonth(baseDate.getMonth() + 1));
        }

        // Get first column in project
        const firstCol = await prisma.boardColumn.findFirst({
          where: { projectId: currentTask.projectId },
          orderBy: { order: 'asc' },
        });

        if (firstCol && nextDueDate) {
          const lastTask = await prisma.task.findFirst({
            where: { projectId: currentTask.projectId },
            orderBy: { taskNumber: 'desc' },
          });

          await prisma.task.create({
            data: {
              projectId: currentTask.projectId,
              columnId: firstCol.id,
              taskNumber: (lastTask?.taskNumber || 100) + 1,
              title: currentTask.title,
              description: currentTask.description,
              priority: currentTask.priority,
              dueDate: nextDueDate,
              labels: currentTask.labels,
              isRecurring: true,
              recurrenceRule: currentTask.recurrenceRule,
              creatorId: req.user.id,
            },
          });
        }
      }
    }

    emitToProject(currentTask.projectId, 'task:moved', {
      taskId: id,
      sourceColumnId: currentTask.columnId,
      destColumnId: columnId,
      newOrder: order,
    });

    return res.status(200).json({ task: updated });
  } catch (error) {
    console.error('moveTask error:', error);
    return res.status(500).json({ error: 'Failed to move task' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });

    await prisma.task.delete({ where: { id } });
    emitToProject(task.projectId, 'task:deleted', { taskId: id });

    return res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('deleteTask error:', error);
    return res.status(500).json({ error: 'Failed to delete task' });
  }
};

// Bulk Actions (Update status, priority, or assignee for multiple tasks)
export const bulkUpdateTasks = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { taskIds, columnId, priority, assigneeId } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'taskIds must be a non-empty array' });
    }

    const updates: any = {};
    if (columnId) updates.columnId = columnId;
    if (priority) updates.priority = priority;

    if (Object.keys(updates).length > 0) {
      await prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: updates,
      });
    }

    if (assigneeId) {
      for (const taskId of taskIds) {
        await prisma.taskAssignee.upsert({
          where: {
            taskId_userId: { taskId, userId: assigneeId },
          },
          create: { taskId, userId: assigneeId },
          update: {},
        });
      }
    }

    return res.status(200).json({
      message: `Successfully updated ${taskIds.length} tasks`,
    });
  } catch (error) {
    console.error('bulkUpdateTasks error:', error);
    return res.status(500).json({ error: 'Failed to perform bulk task update' });
  }
};

// Subtask Operations
export const addSubtask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { title } = req.body;

    if (!title) return res.status(400).json({ error: 'Subtask title is required' });

    const lastSub = await prisma.subtask.findFirst({
      where: { taskId },
      orderBy: { order: 'desc' },
    });

    const subtask = await prisma.subtask.create({
      data: {
        taskId,
        title,
        order: (lastSub?.order ?? -1) + 1,
      },
    });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    if (task) {
      emitToProject(task.projectId, 'subtask:created', { taskId, subtask });
    }

    return res.status(201).json({ subtask });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add subtask' });
  }
};

export const toggleSubtask = async (req: Request, res: Response) => {
  try {
    const { subtaskId } = req.params;
    const current = await prisma.subtask.findUnique({ where: { id: subtaskId } });
    if (!current) return res.status(404).json({ error: 'Subtask not found' });

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data: { isCompleted: !current.isCompleted },
    });

    const task = await prisma.task.findUnique({
      where: { id: current.taskId },
      select: { projectId: true },
    });
    if (task) {
      emitToProject(task.projectId, 'subtask:updated', {
        taskId: current.taskId,
        subtask: updated,
      });
    }

    return res.status(200).json({ subtask: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to toggle subtask' });
  }
};

export const deleteSubtask = async (req: Request, res: Response) => {
  try {
    const { subtaskId } = req.params;
    const current = await prisma.subtask.findUnique({ where: { id: subtaskId } });
    if (!current) return res.status(404).json({ error: 'Subtask not found' });

    await prisma.subtask.delete({ where: { id: subtaskId } });

    const task = await prisma.task.findUnique({
      where: { id: current.taskId },
      select: { projectId: true },
    });
    if (task) {
      emitToProject(task.projectId, 'subtask:deleted', {
        taskId: current.taskId,
        subtaskId,
      });
    }

    return res.status(200).json({ message: 'Subtask deleted' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete subtask' });
  }
};

// Dependency Operations
export const addDependency = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { dependsOnTaskId } = req.body;

    if (taskId === dependsOnTaskId) {
      return res.status(400).json({ error: 'Task cannot depend on itself' });
    }

    const dependency = await prisma.taskDependency.create({
      data: {
        taskId,
        dependsOnTaskId,
      },
      include: {
        dependsOnTask: {
          select: { id: true, title: true, taskNumber: true, priority: true },
        },
      },
    });

    return res.status(201).json({ dependency });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add dependency' });
  }
};

export const removeDependency = async (req: Request, res: Response) => {
  try {
    const { taskId, dependsOnTaskId } = req.params;

    await prisma.taskDependency.delete({
      where: {
        taskId_dependsOnTaskId: {
          taskId,
          dependsOnTaskId,
        },
      },
    });

    return res.status(200).json({ message: 'Dependency removed' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to remove dependency' });
  }
};
