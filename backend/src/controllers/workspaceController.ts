import { Request, Response } from 'express';
import prisma from '../config/db';

/** List all workspaces the authenticated user belongs to */
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
        joinRequests: {
          where: { status: 'PENDING' },
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
          orderBy: { requestedAt: 'desc' },
        },
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
    const joinSlug = slug;
    const inviteCode =
      type === 'COMMUNITY'
        ? `COMMUNITY-${baseSlug.toUpperCase().slice(0, 10)}-${Math.floor(1000 + Math.random() * 9000)}`
        : `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        joinSlug,
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
    const isMember = (workspace as any).members?.some((m: any) => m.userId === req.user!.id);
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

    const existing = await prisma.workspace.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Workspace not found' });

    // If changing joinPolicy (allowing or disabling shareable link), only the OWNER can do this
    if (joinPolicy !== undefined && joinPolicy !== existing.joinPolicy) {
      if (existing.ownerId !== req.user!.id) {
        return res.status(403).json({
          error: 'Only the workspace owner can allow or disable the shareable join link',
        });
      }
    }

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

    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberId,
        },
      },
    });

    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found in workspace' });
    }

    // Safety: Cannot demote the only Admin
    if (targetMember.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          error: 'Cannot change the role of the only Admin. Assign another Admin first.',
        });
      }
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

    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberId,
        },
      },
    });

    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found in workspace' });
    }

    // Safety: Cannot remove the only Admin
    if (targetMember.role === 'ADMIN') {
      const adminCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          error: 'Cannot remove the only Admin in this workspace. Assign another Admin first.',
        });
      }
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

export const batchInviteMembers = async (req: Request, res: Response) => {
  try {
    const { id: workspaceId } = req.params;
    // Support both { invites: [{ email, role }] } and { emails: string[], role?: string }
    const { invites, emails, role: defaultRole = 'MEMBER' } = req.body;

    let inviteList: { email: string; role: any }[] = [];

    if (Array.isArray(invites) && invites.length > 0) {
      inviteList = invites.map((inv: any) => ({
        email: String(inv.email).trim().toLowerCase(),
        role: inv.role || defaultRole,
      }));
    } else if (Array.isArray(emails) && emails.length > 0) {
      inviteList = emails.map((em: any) => ({
        email: String(em).trim().toLowerCase(),
        role: defaultRole,
      }));
    } else {
      return res.status(400).json({ error: 'Please provide at least one valid email to invite' });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: { include: { user: true } },
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const results = [];
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    for (const item of inviteList) {
      const email = item.email;
      const role = item.role;
      if (!email || !email.includes('@')) continue;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });

      if (existingUser) {
        const isMember = workspace.members.some((m) => m.userId === existingUser.id);
        if (!isMember) {
          // Direct membership add
          await prisma.workspaceMember.create({
            data: {
              workspaceId,
              userId: existingUser.id,
              role: role as any,
            },
          });

          await prisma.notification.create({
            data: {
              userId: existingUser.id,
              actorId: req.user!.id,
              type: 'ASSIGNMENT',
              title: `Added to ${workspace.name}`,
              message: `${req.user!.name} invited and added you to ${workspace.name} as ${role}`,
              entityId: workspaceId,
            },
          });
        }
      }

      // Generate unique token
      const token = Buffer.from(
        `${workspaceId}:${email}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
      ).toString('base64url');

      // Remove any prior pending invites for this email to avoid stale duplicates
      await prisma.workspaceInvitation.deleteMany({
        where: {
          workspaceId,
          email,
          status: 'PENDING',
        },
      });

      const invitation = await prisma.workspaceInvitation.create({
        data: {
          workspaceId,
          email,
          role: role as any,
          token,
          invitedById: req.user?.id,
          status: 'PENDING',
          expiresAt,
        },
      });

      console.log(`[EMAIL INVITE] Dispatched invite to ${email} for workspace ${workspace.name}. Link: /invite/${token}`);
      results.push({ email, role, invitation, inviteLink: `/invite/${token}` });
    }

    return res.status(201).json({
      message: `${results.length} invitations processed successfully`,
      invitations: results,
    });
  } catch (error) {
    console.error('batchInviteMembers error:', error);
    return res.status(500).json({ error: 'Failed to process team invitations' });
  }
};

export const revokeInvitation = async (req: Request, res: Response) => {
  try {
    const { id: workspaceId, inviteId } = req.params;

    const invite = await prisma.workspaceInvitation.findFirst({
      where: { id: inviteId, workspaceId },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    await prisma.workspaceInvitation.delete({
      where: { id: inviteId },
    });

    return res.status(200).json({ message: 'Invitation revoked successfully' });
  } catch (error) {
    console.error('revokeInvitation error:', error);
    return res.status(500).json({ error: 'Failed to revoke invitation' });
  }
};

export const regenerateInviteCode = async (req: Request, res: Response) => {
  try {
    const { id: workspaceId } = req.params;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Only the workspace OWNER can regenerate the shareable link
    if (workspace.ownerId !== req.user!.id) {
      return res.status(403).json({
        error: 'Only the workspace owner can regenerate the shareable join link',
      });
    }

    const baseSlug = workspace.slug.split('-')[0] || 'flow';
    const newJoinSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 8).toLowerCase()}`;
    const prefix = workspace.slug ? workspace.slug.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) : 'FLOW';
    const newCode = `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        inviteCode: newCode,
        joinSlug: newJoinSlug,
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
        },
        invitations: true,
        joinRequests: {
          where: { status: 'PENDING' },
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
          orderBy: { requestedAt: 'desc' },
        },
      },
    });

    return res.status(200).json({
      message: 'Invite link regenerated successfully',
      workspace: updated,
      inviteCode: newCode,
      joinSlug: newJoinSlug,
    });
  } catch (error) {
    console.error('regenerateInviteCode error:', error);
    return res.status(500).json({ error: 'Failed to regenerate invite link' });
  }
};

// =========================================================================
// WORKSPACE JOIN-REQUEST FLOW (PUBLIC LINK APPROVAL ARCHITECTURE)
// =========================================================================

export const getJoinInfo = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const workspace = await prisma.workspace.findFirst({
      where: {
        OR: [{ joinSlug: slug }, { joinSlug: null, slug: slug }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        joinSlug: true,
        description: true,
        logoUrl: true,
        type: true,
        joinPolicy: true,
        _count: {
          select: { members: true },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'This invite link is no longer valid or does not exist.' });
    }

    if (workspace.type === 'PERSONAL') {
      return res.status(403).json({ error: 'Personal workspaces do not allow public join requests.' });
    }

    // For TEAM workspaces, the owner must have explicitly enabled the shareable link
    if (workspace.type === 'TEAM' && workspace.joinPolicy !== 'PUBLIC_LINK') {
      return res.status(403).json({
        error: 'The workspace owner has not enabled public link joining for this workspace. Please request an email invitation directly.',
      });
    }

    return res.status(200).json({
      workspace: {
        ...workspace,
        memberCount: workspace._count.members,
      },
    });
  } catch (error) {
    console.error('getJoinInfo error:', error);
    return res.status(500).json({ error: 'Failed to retrieve workspace information' });
  }
};

export const createJoinRequest = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { slug } = req.params;

    const workspace = await prisma.workspace.findFirst({
      where: {
        OR: [{ joinSlug: slug }, { joinSlug: null, slug: slug }],
      },
      include: {
        members: true,
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'This invite link is no longer valid or does not exist.' });
    }

    if (workspace.type === 'PERSONAL') {
      return res.status(403).json({ error: 'Personal workspaces do not allow public join requests.' });
    }

    // For TEAM workspaces, the owner must have explicitly enabled the shareable link
    if (workspace.type === 'TEAM' && workspace.joinPolicy !== 'PUBLIC_LINK') {
      return res.status(403).json({
        error: 'The workspace owner has not enabled public link joining for this workspace. Please request an email invitation directly.',
      });
    }

    // Check if user is already a member
    const isMember = (workspace as any).members?.some((m: any) => m.userId === req.user!.id);
    if (isMember) {
      return res.status(200).json({
        alreadyMember: true,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        message: 'You are already a member of this workspace',
      });
    }

    // Check if a pending join request already exists
    const existing = await prisma.workspaceJoinRequest.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: req.user!.id,
        },
      },
    });

    if (existing && existing.status === 'PENDING') {
      return res.status(200).json({
        alreadyRequested: true,
        status: 'PENDING',
        request: existing,
        workspace: { id: workspace.id, name: workspace.name },
        message: 'Request sent — waiting for approval',
      });
    }

    // Upsert join request (re-activate if previously denied)
    const joinRequest = await prisma.workspaceJoinRequest.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: req.user!.id,
        },
      },
      create: {
        workspaceId: workspace.id,
        userId: req.user!.id,
        requestedRole: 'MEMBER',
        status: 'PENDING',
        requestedAt: new Date(),
      },
      update: {
        status: 'PENDING',
        requestedAt: new Date(),
        decidedBy: null,
        decidedAt: null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Notify workspace Admins
    const admins = ((workspace as any).members || []).filter((m: any) => m.role === 'ADMIN');
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.userId,
          actorId: req.user!.id,
          type: 'ASSIGNMENT',
          title: 'New Join Request',
          message: `${req.user!.name} requested to join ${workspace.name}`,
          entityId: workspace.id,
        },
      }).catch(() => {});
    }

    console.log(`[JOIN REQUEST] ${req.user!.email} requested to join ${workspace.name} (${workspace.id})`);

    return res.status(201).json({
      success: true,
      status: 'PENDING',
      request: joinRequest,
      workspace: { id: workspace.id, name: workspace.name },
      message: 'Request sent — waiting for approval',
    });
  } catch (error) {
    console.error('createJoinRequest error:', error);
    return res.status(500).json({ error: 'Failed to submit join request' });
  }
};

export const listJoinRequests = async (req: Request, res: Response) => {
  try {
    const { id: workspaceId } = req.params;

    const requests = await prisma.workspaceJoinRequest.findMany({
      where: {
        workspaceId,
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return res.status(200).json({ requests });
  } catch (error) {
    console.error('listJoinRequests error:', error);
    return res.status(500).json({ error: 'Failed to fetch join requests' });
  }
};

export const approveJoinRequest = async (req: Request, res: Response) => {
  try {
    const { id: workspaceId, requestId } = req.params;
    const { role = 'MEMBER' } = req.body;

    const joinRequest = await prisma.workspaceJoinRequest.findFirst({
      where: { id: requestId, workspaceId },
      include: { user: true, workspace: true },
    });

    if (!joinRequest) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    if (joinRequest.status !== 'PENDING') {
      return res.status(400).json({ error: `Join request is already ${joinRequest.status.toLowerCase()}` });
    }

    // 1. Update Join Request
    await prisma.workspaceJoinRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        decidedBy: req.user!.id,
        decidedAt: new Date(),
        requestedRole: role as any,
      },
    });

    // 2. Insert into WorkspaceMember
    const member = await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: joinRequest.userId,
        },
      },
      create: {
        workspaceId,
        userId: joinRequest.userId,
        role: role as any,
      },
      update: {
        role: role as any,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
      },
    });

    // 3. Notify the approved user
    await prisma.notification.create({
      data: {
        userId: joinRequest.userId,
        actorId: req.user!.id,
        type: 'ASSIGNMENT',
        title: 'Workspace Join Request Approved',
        message: `Your request to join ${joinRequest.workspace.name} has been approved! You now have access.`,
        entityId: workspaceId,
      },
    }).catch(() => {});

    console.log(`[JOIN REQUEST APPROVED] User ${joinRequest.user.email} approved by ${req.user!.email} as ${role}`);

    return res.status(200).json({
      message: `Approved ${joinRequest.user.name} as ${role}`,
      member,
    });
  } catch (error) {
    console.error('approveJoinRequest error:', error);
    return res.status(500).json({ error: 'Failed to approve join request' });
  }
};

export const denyJoinRequest = async (req: Request, res: Response) => {
  try {
    const { id: workspaceId, requestId } = req.params;

    const joinRequest = await prisma.workspaceJoinRequest.findFirst({
      where: { id: requestId, workspaceId },
      include: { user: true, workspace: true },
    });

    if (!joinRequest) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    await prisma.workspaceJoinRequest.update({
      where: { id: requestId },
      data: {
        status: 'DENIED',
        decidedBy: req.user!.id,
        decidedAt: new Date(),
      },
    });

    await prisma.notification.create({
      data: {
        userId: joinRequest.userId,
        actorId: req.user!.id,
        type: 'ASSIGNMENT',
        title: 'Workspace Join Request Declined',
        message: `Your request to join ${joinRequest.workspace.name} was declined by a workspace administrator.`,
        entityId: workspaceId,
      },
    }).catch(() => {});

    console.log(`[JOIN REQUEST DENIED] User ${joinRequest.user.email} denied by ${req.user!.email}`);

    return res.status(200).json({ message: 'Join request declined' });
  } catch (error) {
    console.error('denyJoinRequest error:', error);
    return res.status(500).json({ error: 'Failed to decline join request' });
  }
};

