import { Request, Response } from 'express';
import prisma from '../config/db';

export const getInvitationByToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            logoUrl: true,
            description: true,
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or invalid' });
    }

    const isExpired = new Date(invitation.expiresAt) < new Date();
    if (isExpired && invitation.status === 'PENDING') {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return res.status(410).json({ error: 'This invitation has expired' });
    }

    return res.status(200).json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
      workspace: invitation.workspace,
    });
  } catch (error) {
    console.error('getInvitationByToken error:', error);
    return res.status(500).json({ error: 'Failed to verify invitation' });
  }
};

export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required to accept invite' });
    }

    const { token } = req.params;

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token },
      include: {
        workspace: true,
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status === 'ACCEPTED') {
      return res.status(200).json({
        message: 'You have already accepted this invitation',
        workspace: invitation.workspace,
      });
    }

    if (new Date(invitation.expiresAt) < new Date() || invitation.status === 'EXPIRED') {
      return res.status(410).json({ error: 'This invitation has expired' });
    }

    // Add or update workspace membership
    const member = await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: req.user.id,
        },
      },
      create: {
        workspaceId: invitation.workspaceId,
        userId: req.user.id,
        role: invitation.role,
      },
      update: {
        role: invitation.role,
      },
      include: {
        workspace: true,
      },
    });

    // Mark invitation as accepted
    await prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    return res.status(200).json({
      message: `Successfully joined ${invitation.workspace.name}!`,
      member,
      workspace: invitation.workspace,
    });
  } catch (error) {
    console.error('acceptInvitation error:', error);
    return res.status(500).json({ error: 'Failed to accept invitation' });
  }
};
