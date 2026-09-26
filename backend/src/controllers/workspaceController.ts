import { Request, Response } from 'express';
import prisma from '../config/db';

export const listWorkspaces = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user.id },
      include: {
        workspace: {
          include: {
            _count: {
              select: { members: true, spaces: true },
            },
            spaces: {
              include: {
                projects: {
                  select: { id: true, name: true, key: true, color: true },
                },
              },
            },
          },
        },
      },
    });

    const workspaces = memberships.map((m) => {
      const spaces = (m.workspace as any).spaces || [];
      const projects = spaces.flatMap((s: any) => s.projects || []);
      return {
        ...m.workspace,
        spaces,
        projects,
        currentUserRole: m.role,
        joinedAt: m.joinedAt,
      };
    });

    return res.status(200).json({ workspaces });
  } catch (error) {
    console.error('listWorkspaces error:', error);
    return res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
};

export const getWorkspace = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
          },
        },
        spaces: {
          include: {
            projects: {
              include: {
                lists: {
                  include: {
                    columns: true,
                    _count: { select: { tasks: true } },
                  },
                },
              },
            },
          },
        },
        invitations: true,
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    return res.status(200).json({ workspace });
  } catch (error) {
    console.error('getWorkspace error:', error);
    return res.status(500).json({ error: 'Failed to fetch workspace' });
  }
};

export const createWorkspace = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name,
      description,
      logoUrl,
      type = 'TEAM',
      joinPolicy = type === 'COMMUNITY' ? 'PUBLIC_LINK' : 'INVITE_ONLY',
      plan = 'FREE',
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Workspace name is required' });

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    const inviteCode =
      type === 'COMMUNITY'
        ? `COMMUNITY-${baseSlug.toUpperCase().slice(0, 10)}-${Math.floor(1000 + Math.random() * 9000)}`
        : `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        description,
        type,
        joinPolicy,
        plan,
        inviteCode,
        logoUrl: logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${slug}`,
        ownerId: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            role: 'ADMIN',
          },
        },
        spaces: {
          create: {
            name: type === 'PERSONAL' ? 'Personal Life & Focus' : type === 'COMMUNITY' ? 'Community Hub' : 'General Space',
            color: '#7B68EE',
            icon: type === 'PERSONAL' ? 'user' : type === 'COMMUNITY' ? 'users' : 'folder',
            projects: {
              create: {
                name: type === 'PERSONAL' ? 'Personal Tasks' : type === 'COMMUNITY' ? 'Community Projects' : 'Core Tasks',
                key: type === 'PERSONAL' ? 'ME' : type === 'COMMUNITY' ? 'HUB' : 'CORE',
                description: 'Default project to start organizing tasks immediately',
                lists: {
                  create: {
                    name: 'Sprint 1',
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
            },
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        spaces: {
          include: {
            projects: {
              include: {
                lists: {
                  include: { columns: true },
                },
              },
            },
          },
        },
      },
    });

    return res.status(201).json({ workspace });
  } catch (error) {
    console.error('createWorkspace error:', error);
    return res.status(500).json({ error: 'Failed to create workspace' });
  }
};

export const joinWorkspace = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { inviteCode, workspaceId, slug } = req.body;

    let workspace = null;
    if (inviteCode) {
      workspace = await prisma.workspace.findFirst({
        where: { inviteCode: inviteCode.trim().toUpperCase() },
        include: { members: true },
      });
    } else if (workspaceId) {
      workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { members: true },
      });
    } else if (slug) {
      workspace = await prisma.workspace.findUnique({
        where: { slug },
        include: { members: true },
      });
    }

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or invalid invite code' });
    }

    // Check if user is already a member
    const isMember = workspace.members.some((m) => m.userId === req.user!.id);
    if (isMember) {
      return res.status(200).json({
        message: 'Already a member of this workspace',
        workspace,
      });
    }

    // Check join policy: Personal workspaces cannot be joined
    if (workspace.type === 'PERSONAL') {
      return res.status(403).json({ error: 'Personal workspaces cannot be joined by other users' });
    }

    // If Team and invite-only without inviteCode match, deny
    if (workspace.type === 'TEAM' && workspace.joinPolicy === 'INVITE_ONLY' && !inviteCode) {
      return res.status(403).json({ error: 'This workspace is invite-only' });
    }

    // Add user as MEMBER
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: req.user.id,
        role: 'MEMBER',
      },
    });

    const updatedWorkspace = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        spaces: {
          include: {
            projects: {
              include: {
                lists: { include: { columns: true } },
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      message: `Successfully joined ${workspace.name}!`,
      workspace: updatedWorkspace,
    });
  } catch (error) {
    console.error('joinWorkspace error:', error);
    return res.status(500).json({ error: 'Failed to join workspace' });
  }
};

export const updateWorkspace = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, logoUrl, type, joinPolicy, plan } = req.body;

    const workspace = await prisma.workspace.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(type ? { type } : {}),
        ...(joinPolicy ? { joinPolicy } : {}),
        ...(plan ? { plan } : {}),
      },
    });

    return res.status(200).json({ workspace });
  } catch (error) {
    console.error('updateWorkspace error:', error);
    return res.status(500).json({ error: 'Failed to update workspace' });
  }
};

export const inviteMember = async (req: Request, res: Response) => {
  try {
    const { id: workspaceId } = req.params;
    const { email, role = 'MEMBER' } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Check if target user exists in database
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      // Check if already a member
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return res.status(400).json({ error: 'User is already a member of this workspace' });
      }

      // Add user directly as member
      const member = await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: existingUser.id,
          role,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true, role: true },
          },
        },
      });

      // Send in-app notification to invited user
      await prisma.notification.create({
        data: {
          userId: existingUser.id,
          actorId: req.user?.id || existingUser.id,
          type: 'ASSIGNMENT',
          title: 'Added to Workspace',
          message: `You were added to the workspace as ${role}`,
          entityId: workspaceId,
        },
      });

      return res.status(200).json({ message: 'User added directly to workspace', member });
    }

    // Otherwise create pending invitation
    const token = Buffer.from(`${workspaceId}:${email}:${Date.now()}`).toString('base64');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email: email.toLowerCase(),
        role,
        token,
        expiresAt,
      },
    });

    console.log(`[SIMULATED EMAIL] Invitation sent to ${email} for workspace ${workspaceId}. Token: ${token}`);

    return res.status(201).json({
      message: 'Invitation dispatched successfully',
      invitation,
      inviteLink: `/invite/${token}`,
    });
  } catch (error) {
    console.error('inviteMember error:', error);
    return res.status(500).json({ error: 'Failed to invite member' });
  }
};

export const updateMemberRole = async (req: Request, res: Response) => {
  try {
    const { id: workspaceId, memberId } = req.params;
    const { role } = req.body;

    if (!['ADMIN', 'MANAGER', 'MEMBER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const updated = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberId,
        },
      },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return res.status(200).json({ member: updated });
  } catch (error) {
    console.error('updateMemberRole error:', error);
    return res.status(500).json({ error: 'Failed to update member role' });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  try {
    const { id: workspaceId, memberId } = req.params;

    // Check workspace owner cannot be removed
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (workspace?.ownerId === memberId) {
      return res.status(400).json({ error: 'Workspace owner cannot be removed' });
    }

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberId,
        },
      },
    });

    return res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('removeMember error:', error);
    return res.status(500).json({ error: 'Failed to remove member' });
  }
};
