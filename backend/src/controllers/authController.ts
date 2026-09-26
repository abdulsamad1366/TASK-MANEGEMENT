import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/db';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role = 'MEMBER' } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: role as any,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });

    // Create default workspace for new user
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-workspace-${Date.now().toString().slice(-4)}`;
    const workspace = await prisma.workspace.create({
      data: {
        name: `${name}'s Workspace`,
        slug,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN',
          },
        },
      },
    });

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user,
      tokens,
      defaultWorkspace: workspace,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        workspaceMemberships: {
          include: {
            workspace: {
              select: { id: true, name: true, slug: true, logoUrl: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      notificationSettings: user.notificationSettings,
      workspaces: user.workspaceMemberships.map((m) => ({
        workspaceId: m.workspaceId,
        role: m.role,
        ...m.workspace,
      })),
    };

    return res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword,
      tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const payload = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return res.status(200).json({ tokens });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        workspaceMemberships: {
          include: {
            workspace: {
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

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const formattedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      notificationSettings: user.notificationSettings
        ? JSON.parse(user.notificationSettings)
        : {},
      workspaces: user.workspaceMemberships.map((m) => ({
        workspaceId: m.workspaceId,
        role: m.role,
        name: m.workspace.name,
        slug: m.workspace.slug,
        logoUrl: m.workspace.logoUrl,
        projects: m.workspace.projects,
      })),
    };

    return res.status(200).json({ user: formattedUser });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ error: 'Failed to get user profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, avatarUrl, notificationSettings } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name ? { name } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(notificationSettings
          ? { notificationSettings: JSON.stringify(notificationSettings) }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        notificationSettings: true,
      },
    });

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        ...updatedUser,
        notificationSettings: updatedUser.notificationSettings
          ? JSON.parse(updatedUser.notificationSettings)
          : {},
      },
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't leak if email exists
    if (!user) {
      return res.status(200).json({
        message: 'If that email address exists, a password reset link has been dispatched.',
      });
    }

    const resetToken = Buffer.from(`${user.id}:${Date.now() + 3600000}`).toString('base64');
    console.log(`[SIMULATED EMAIL] Password reset requested for ${email}. Token: ${resetToken}`);

    return res.status(200).json({
      message: 'If that email address exists, a password reset link has been dispatched.',
      debugResetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

export const confirmPasswordReset = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, expiryStr] = decoded.split(':');
    const expiry = parseInt(expiryStr, 10);

    if (Date.now() > expiry) {
      return res.status(400).json({ error: 'Password reset link has expired' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return res.status(200).json({ message: 'Password has been successfully updated. You may now login.' });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid reset token' });
  }
};
