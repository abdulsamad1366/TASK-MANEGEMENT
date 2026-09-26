import { Request, Response } from 'express';
import prisma from '../config/db';
import { emitToProject } from '../services/socket';

export const listProjects = async (req: Request, res: Response) => {
  try {
    const { workspaceId, spaceId } = req.query;

    const where: any = {};
    if (spaceId) {
      where.spaceId = String(spaceId);
    } else if (workspaceId) {
      where.space = { workspaceId: String(workspaceId) };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        space: {
          select: { id: true, name: true, color: true, workspaceId: true },
        },
        lists: {
          include: {
            columns: { orderBy: { order: 'asc' } },
            _count: { select: { tasks: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ projects });
  } catch (error) {
    console.error('listProjects error:', error);
    return res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        space: {
          include: {
            workspace: {
              include: {
                members: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true, avatarUrl: true },
                    },
                  },
                },
              },
            },
          },
        },
        lists: {
          include: {
            columns: {
              orderBy: { order: 'asc' },
            },
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                column: true,
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
                blocking: true,
                blockedBy: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.status(200).json({ project });
  } catch (error) {
    console.error('getProject error:', error);
    return res.status(500).json({ error: 'Failed to fetch project' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const { spaceId, workspaceId, name, key, description, color = '#6366f1', icon = 'folder' } = req.body;

    if (!name || !key) {
      return res.status(400).json({ error: 'name and key are required' });
    }

    let targetSpaceId = spaceId;
    if (!targetSpaceId && workspaceId) {
      // Find or create default space for workspace
      let space = await prisma.space.findFirst({
        where: { workspaceId },
      });
      if (!space) {
        space = await prisma.space.create({
          data: {
            workspaceId,
            name: 'General Space',
            color: '#7B68EE',
            icon: 'folder',
          },
        });
      }
      targetSpaceId = space.id;
    }

    if (!targetSpaceId) {
      return res.status(400).json({ error: 'spaceId or workspaceId is required' });
    }

    const sanitizedKey = key.toUpperCase().trim();

    const existing = await prisma.project.findFirst({
      where: { spaceId: targetSpaceId, key: sanitizedKey },
    });

    if (existing) {
      return res.status(409).json({ error: `Project key '${sanitizedKey}' already in use in this space` });
    }

    const project = await prisma.project.create({
      data: {
        spaceId: targetSpaceId,
        name,
        key: sanitizedKey,
        description,
        color,
        icon,
        lists: {
          create: {
            name: 'Default List',
            columns: {
              create: [
                { name: 'To Do', color: '#3b82f6', order: 0, isCompleted: false },
                { name: 'In Progress', color: '#8b5cf6', order: 1, isCompleted: false },
                { name: 'In Review', color: '#ec4899', order: 2, isCompleted: false },
                { name: 'Done', color: '#10b981', order: 3, isCompleted: true },
              ],
            },
          },
        },
      },
      include: {
        lists: {
          include: {
            columns: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    return res.status(201).json({ project });
  } catch (error) {
    console.error('createProject error:', error);
    return res.status(500).json({ error: 'Failed to create project' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon } = req.body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(color ? { color } : {}),
        ...(icon ? { icon } : {}),
      },
      include: {
        lists: {
          include: {
            columns: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    emitToProject(id, 'project:updated', project);
    return res.status(200).json({ project });
  } catch (error) {
    console.error('updateProject error:', error);
    return res.status(500).json({ error: 'Failed to update project' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });
    return res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('deleteProject error:', error);
    return res.status(500).json({ error: 'Failed to delete project' });
  }
};

// Column Management
export const createColumn = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, color = '#94a3b8', isCompleted = false } = req.body;

    // Get the first list in the project or create one
    let list = await prisma.taskList.findFirst({
      where: { projectId },
    });

    if (!list) {
      list = await prisma.taskList.create({
        data: { projectId, name: 'Main Tasks' },
      });
    }

    const lastCol = await prisma.boardColumn.findFirst({
      where: { listId: list.id },
      orderBy: { order: 'desc' },
    });

    const order = (lastCol?.order ?? -1) + 1;

    const column = await prisma.boardColumn.create({
      data: {
        listId: list.id,
        name,
        color,
        isCompleted,
        order,
      },
      include: {
        tasks: true,
      },
    });

    emitToProject(projectId, 'column:created', column);
    return res.status(201).json({ column });
  } catch (error) {
    console.error('createColumn error:', error);
    return res.status(500).json({ error: 'Failed to create column' });
  }
};

export const updateColumn = async (req: Request, res: Response) => {
  try {
    const { columnId } = req.params;
    const { name, color, isCompleted } = req.body;

    const column = await prisma.boardColumn.update({
      where: { id: columnId },
      data: {
        ...(name ? { name } : {}),
        ...(color ? { color } : {}),
        ...(isCompleted !== undefined ? { isCompleted } : {}),
      },
      include: {
        list: true,
      },
    });

    if (column.list?.projectId) {
      emitToProject(column.list.projectId, 'column:updated', column);
    }
    return res.status(200).json({ column });
  } catch (error) {
    console.error('updateColumn error:', error);
    return res.status(500).json({ error: 'Failed to update column' });
  }
};

export const reorderColumns = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { columnIds } = req.body;

    if (!Array.isArray(columnIds)) {
      return res.status(400).json({ error: 'columnIds must be an array' });
    }

    const updates = columnIds.map((id, index) =>
      prisma.boardColumn.update({
        where: { id },
        data: { order: index },
      })
    );

    await prisma.$transaction(updates);

    emitToProject(projectId, 'columns:reordered', { columnIds });
    return res.status(200).json({ message: 'Columns reordered successfully' });
  } catch (error) {
    console.error('reorderColumns error:', error);
    return res.status(500).json({ error: 'Failed to reorder columns' });
  }
};

export const deleteColumn = async (req: Request, res: Response) => {
  try {
    const { columnId } = req.params;
    const column = await prisma.boardColumn.findUnique({
      where: { id: columnId },
      include: { list: true },
    });
    if (!column) return res.status(404).json({ error: 'Column not found' });

    await prisma.boardColumn.delete({ where: { id: columnId } });
    if (column.list?.projectId) {
      emitToProject(column.list.projectId, 'column:deleted', { columnId });
    }
    return res.status(200).json({ message: 'Column deleted successfully' });
  } catch (error) {
    console.error('deleteColumn error:', error);
    return res.status(500).json({ error: 'Failed to delete column' });
  }
};
