import { Request, Response } from 'express';
import prisma from '../config/db';

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { workspaceId } = req.query;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

    const baseWhere: any = {};
    if (workspaceId) {
      baseWhere.list = {
        project: {
          space: {
            workspaceId: String(workspaceId),
          },
        },
      };
    }

    // 1. My Assigned Tasks
    const myTasks = await prisma.task.findMany({
      where: {
        ...baseWhere,
        assignees: { some: { userId: req.user.id } },
      },
      include: {
        list: {
          include: {
            project: { select: { name: true, key: true, color: true } },
          },
        },
        column: { select: { name: true, color: true, isCompleted: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const myCompleted = myTasks.filter((t) => t.column.isCompleted).length;
    const myPending = myTasks.length - myCompleted;
    const myOverdue = myTasks.filter(
      (t) => !t.column.isCompleted && t.dueDate && new Date(t.dueDate) < now
    ).length;
    const myDueToday = myTasks.filter(
      (t) =>
        !t.column.isCompleted &&
        t.dueDate &&
        new Date(t.dueDate) >= startOfToday &&
        new Date(t.dueDate) <= endOfToday
    ).length;
    const myDueThisWeek = myTasks.filter(
      (t) =>
        !t.column.isCompleted &&
        t.dueDate &&
        new Date(t.dueDate) >= startOfToday &&
        new Date(t.dueDate) <= endOfWeek
    ).length;

    // 2. Workspace Overview
    const totalTasks = await prisma.task.count({ where: baseWhere });
    const completedTasks = await prisma.task.count({
      where: { ...baseWhere, column: { isCompleted: true } },
    });
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 3. Priority Breakdown
    const tasksByPriority = await prisma.task.groupBy({
      by: ['priority'],
      where: baseWhere,
      _count: { id: true },
    });

    // 4. Team Workload (tasks per user)
    let teamWorkload: any[] = [];
    if (workspaceId) {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: String(workspaceId) },
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true, email: true },
          },
        },
      });

      teamWorkload = await Promise.all(
        members.map(async (m) => {
          const count = await prisma.taskAssignee.count({
            where: {
              userId: m.userId,
              task: baseWhere,
            },
          });
          const done = await prisma.taskAssignee.count({
            where: {
              userId: m.userId,
              task: {
                ...baseWhere,
                column: { isCompleted: true },
              },
            },
          });
          return {
            user: m.user,
            totalAssigned: count,
            completed: done,
            pending: count - done,
          };
        })
      );
    }

    return res.status(200).json({
      personal: {
        total: myTasks.length,
        completed: myCompleted,
        pending: myPending,
        overdue: myOverdue,
        dueToday: myDueToday,
        dueThisWeek: myDueThisWeek,
        tasks: myTasks.slice(0, 10),
      },
      team: {
        totalTasks,
        completedTasks,
        completionRate,
        tasksByPriority: tasksByPriority.map((p) => ({
          priority: p.priority,
          count: p._count.id,
        })),
        workload: teamWorkload,
      },
    });
  } catch (error) {
    console.error('getDashboardSummary error:', error);
    return res.status(500).json({ error: 'Failed to generate dashboard analytics' });
  }
};

export const getProjectBurndown = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        lists: {
          include: {
            tasks: {
              include: { column: true },
            },
          },
        },
      },
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const allTasks = project.lists.flatMap((l) => l.tasks);

    // Generate 14-day burndown simulation / trajectory
    const days = 14;
    const totalPoints = allTasks.length || 10;
    const completedNow = allTasks.filter((t) => t.column.isCompleted).length;

    const dataPoints = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const idealRemaining = Math.max(
        0,
        Math.round(totalPoints - ((days - 1 - i) / (days - 1)) * totalPoints)
      );
      const progressRatio = (days - 1 - i) / (days - 1);
      const actualRemaining = Math.max(
        totalPoints - completedNow,
        Math.round(totalPoints - progressRatio * completedNow)
      );

      dataPoints.push({
        date: d.toISOString().split('T')[0],
        day: `Day ${days - i}`,
        ideal: idealRemaining,
        actual: actualRemaining,
      });
    }

    return res.status(200).json({
      projectId,
      totalTasks: allTasks.length,
      completedTasks: completedNow,
      burndown: dataPoints,
    });
  } catch (error) {
    console.error('getProjectBurndown error:', error);
    return res.status(500).json({ error: 'Failed to calculate burndown chart' });
  }
};
