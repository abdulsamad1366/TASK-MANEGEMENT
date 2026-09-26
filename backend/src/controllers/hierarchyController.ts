import { Request, Response } from 'express';
import prisma from '../config/db';

// 1. Get full ClickUp Hierarchy for Workspace: Spaces -> Projects -> Lists
export const getWorkspaceHierarchy = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const spaces = await prisma.space.findMany({
      where: { workspaceId },
      orderBy: { order: 'asc' },
      include: {
        projects: {
          orderBy: { order: 'asc' },
          include: {
            lists: {
              orderBy: { order: 'asc' },
              include: {
                columns: { orderBy: { order: 'asc' } },
                _count: { select: { tasks: true } },
              },
            },
          },
        },
      },
    });

    return res.status(200).json({ spaces });
  } catch (error) {
    console.error('getWorkspaceHierarchy error:', error);
    return res.status(500).json({ error: 'Failed to fetch workspace spaces hierarchy' });
  }
};

// 2. Spaces CRUD
export const createSpace = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { name, color = '#7B68EE', icon = 'rocket' } = req.body;

    if (!name) return res.status(400).json({ error: 'Space name is required' });

    const lastSpace = await prisma.space.findFirst({
      where: { workspaceId },
      orderBy: { order: 'desc' },
    });

    const space = await prisma.space.create({
      data: {
        workspaceId,
        name,
        color,
        icon,
        order: (lastSpace?.order ?? -1) + 1,
      },
      include: {
        projects: {
          include: {
            lists: {
              include: { columns: true },
            },
          },
        },
      },
    });

    return res.status(201).json({ space });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create space' });
  }
};

// 3. Projects CRUD within Space
export const createProject = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    const { name, key, description, color = '#7B68EE', icon = 'folder' } = req.body;

    if (!name || !key) return res.status(400).json({ error: 'Project name and key are required' });

    const sanitizedKey = key.toUpperCase().trim();

    const lastProj = await prisma.project.findFirst({
      where: { spaceId },
      orderBy: { order: 'desc' },
    });

    // Create project along with a default TaskList and columns
    const project = await prisma.project.create({
      data: {
        spaceId,
        name,
        key: sanitizedKey,
        description,
        color,
        icon,
        order: (lastProj?.order ?? -1) + 1,
        lists: {
          create: {
            name: 'General List',
            order: 0,
            columns: {
              create: [
                { name: 'To Do', color: '#94A3B8', order: 0, isCompleted: false },
                { name: 'In Progress', color: '#7B68EE', order: 1, isCompleted: false },
                { name: 'In Review', color: '#F59E0B', order: 2, isCompleted: false },
                { name: 'Done', color: '#10B981', order: 3, isCompleted: true },
              ],
            },
          },
        },
      },
      include: {
        lists: {
          include: { columns: true },
        },
      },
    });

    return res.status(201).json({ project });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create project' });
  }
};

// 4. TaskLists CRUD within Project
export const createTaskList = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ error: 'List name is required' });

    const lastList = await prisma.taskList.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' },
    });

    const list = await prisma.taskList.create({
      data: {
        projectId,
        name,
        description,
        order: (lastList?.order ?? -1) + 1,
        columns: {
          create: [
            { name: 'To Do', color: '#94A3B8', order: 0, isCompleted: false },
            { name: 'In Progress', color: '#7B68EE', order: 1, isCompleted: false },
            { name: 'In Review', color: '#F59E0B', order: 2, isCompleted: false },
            { name: 'Done', color: '#10B981', order: 3, isCompleted: true },
          ],
        },
      },
      include: {
        columns: { orderBy: { order: 'asc' } },
        _count: { select: { tasks: true } },
      },
    });

    return res.status(201).json({ list });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create list' });
  }
};

// 5. Get List Details with Columns & Tasks
export const getTaskList = async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;

    const list = await prisma.taskList.findUnique({
      where: { id: listId },
      include: {
        project: {
          include: {
            space: {
              include: {
                workspace: {
                  include: {
                    members: {
                      include: {
                        user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                assignees: {
                  include: {
                    user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                  },
                },
                subtasks: { orderBy: { order: 'asc' } },
                attachments: true,
                comments: {
                  take: 5,
                  orderBy: { createdAt: 'desc' },
                  include: {
                    user: { select: { id: true, name: true, avatarUrl: true } },
                  },
                },
                _count: { select: { comments: true, attachments: true } },
              },
            },
          },
        },
      },
    });

    if (!list) return res.status(404).json({ error: 'List not found' });

    return res.status(200).json({ list });
  } catch (error) {
    console.error('getTaskList error:', error);
    return res.status(500).json({ error: 'Failed to get list details' });
  }
};

// 6. Update Space
export const updateSpace = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    const { name, color, icon } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;
    if (icon !== undefined) data.icon = icon;

    const space = await prisma.space.update({
      where: { id: spaceId },
      data,
    });
    return res.status(200).json({ space });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update space' });
  }
};

// 7. Delete Space
export const deleteSpace = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    await prisma.space.delete({ where: { id: spaceId } });
    return res.status(200).json({ message: 'Space deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete space' });
  }
};

// 8. Update Task List
export const updateTaskList = async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    const { name, description } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;

    const list = await prisma.taskList.update({
      where: { id: listId },
      data,
    });
    return res.status(200).json({ list });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update list' });
  }
};

// 9. Delete Task List
export const deleteTaskList = async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    await prisma.taskList.delete({ where: { id: listId } });
    return res.status(200).json({ message: 'List deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete list' });
  }
};

// 10. List Column Management (Custom Statuses per List)
export const createListColumn = async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    const { name, color = '#7B68EE', isCompleted = false } = req.body;
    if (!name) return res.status(400).json({ error: 'Column name is required' });

    const lastCol = await prisma.boardColumn.findFirst({
      where: { listId },
      orderBy: { order: 'desc' },
    });

    const column = await prisma.boardColumn.create({
      data: {
        listId,
        name,
        color,
        isCompleted,
        order: (lastCol?.order ?? -1) + 1,
      },
    });

    return res.status(201).json({ column });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create list column' });
  }
};

export const updateListColumn = async (req: Request, res: Response) => {
  try {
    const { columnId } = req.params;
    const { name, color, isCompleted, order } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;
    if (isCompleted !== undefined) data.isCompleted = isCompleted;
    if (order !== undefined) data.order = order;

    const column = await prisma.boardColumn.update({
      where: { id: columnId },
      data,
    });
    return res.status(200).json({ column });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update column' });
  }
};

export const deleteListColumn = async (req: Request, res: Response) => {
  try {
    const { columnId } = req.params;
    await prisma.boardColumn.delete({ where: { id: columnId } });
    return res.status(200).json({ message: 'Column deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete column' });
  }
};

