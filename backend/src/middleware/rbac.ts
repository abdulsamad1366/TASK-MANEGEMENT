import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

export const requireSystemRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

export const requireWorkspaceRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const workspaceId =
      req.params.workspaceId ||
      req.body.workspaceId ||
      (req.query.workspaceId as string);

    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required for authorization' });
    }

    // System ADMIN always bypasses workspace checks
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: req.user.id,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this workspace' });
    }

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({
        error: `Insufficient workspace permissions. Requires: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};
