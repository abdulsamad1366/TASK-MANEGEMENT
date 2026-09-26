/// <reference types="node" />
import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Multi-Tenant Flowdesk Supabase Seed...');

  // Clean existing tables
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.task.deleteMany();
  await prisma.boardColumn.deleteMany();
  await prisma.taskList.deleteMany();
  await prisma.project.deleteMany();
  await prisma.space.deleteMany();
  await prisma.workspaceInvitation.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Users
  const sarah = await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      passwordHash,
      name: 'Sarah Connor',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      role: 'ADMIN',
    },
  });

  const alex = await prisma.user.create({
    data: {
      email: 'manager@acme.com',
      passwordHash,
      name: 'Alex Rivera',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      role: 'MANAGER',
    },
  });

  const david = await prisma.user.create({
    data: {
      email: 'david@acme.com',
      passwordHash,
      name: 'David Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      role: 'MEMBER',
    },
  });

  const priya = await prisma.user.create({
    data: {
      email: 'priya@acme.com',
      passwordHash,
      name: 'Priya Patel',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: 'MEMBER',
    },
  });

  const marcus = await prisma.user.create({
    data: {
      email: 'marcus@acme.com',
      passwordHash,
      name: 'Marcus Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      role: 'MEMBER',
    },
  });

  console.log('✓ Created 5 demo team members');

  // =========================================================================
  // WORKSPACE 1: TEAM WORKSPACE (Acme Technologies)
  // =========================================================================
  const teamWorkspace = await prisma.workspace.create({
    data: {
      name: 'Acme Technologies',
      slug: 'acme-tech',
      description: 'Primary product & engineering team workspace',
      type: 'TEAM',
      joinPolicy: 'INVITE_ONLY',
      plan: 'PRO',
      inviteCode: 'ACME-TEAM-2026',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      ownerId: sarah.id,
      members: {
        create: [
          { userId: sarah.id, role: 'ADMIN' },
          { userId: alex.id, role: 'MANAGER' },
          { userId: david.id, role: 'MEMBER' },
          { userId: priya.id, role: 'MEMBER' },
          { userId: marcus.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const engineeringSpace = await prisma.space.create({
    data: {
      workspaceId: teamWorkspace.id,
      name: 'Engineering',
      color: '#7B68EE',
      icon: 'code',
      order: 0,
    },
  });

  const productSpace = await prisma.space.create({
    data: {
      workspaceId: teamWorkspace.id,
      name: 'Product & Design',
      color: '#06B6D4',
      icon: 'sparkles',
      order: 1,
    },
  });

  const mobileProject = await prisma.project.create({
    data: {
      spaceId: engineeringSpace.id,
      name: 'Mobile App 3.0',
      key: 'APP',
      description: 'Next-gen iOS & Android apps with clean light UX',
      color: '#7B68EE',
      icon: 'smartphone',
      order: 0,
    },
  });

  const sprintList = await prisma.taskList.create({
    data: {
      projectId: mobileProject.id,
      name: 'Sprint 24 - Launch',
      description: 'Core tasks for the mobile app launch release',
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
    include: { columns: true },
  });

  const cols = sprintList.columns.reduce((acc, c) => {
    acc[c.name] = c.id;
    return acc;
  }, {} as Record<string, string>);

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  // Tasks for Team Workspace
  const task1 = await prisma.task.create({
    data: {
      workspaceId: teamWorkspace.id,
      listId: sprintList.id,
      columnId: cols['In Progress'],
      taskNumber: 101,
      title: 'Design Clean Light UI Theme & Design Tokens',
      description:
        'Create a light, minimal UI inspired by Flowdesk with generous whitespace, subtle borders, and signature purple accents.\n\n### Requirements:\n- Soft off-white backgrounds (#F8FAFC / #FFFFFF)\n- Signature purple accent (#7B68EE)\n- Clean sans-serif typography with high contrast',
      priority: 'HIGH',
      order: 1000,
      startDate: new Date(now.getTime() - 2 * day),
      dueDate: new Date(now.getTime() + 2 * day),
      timeEstimate: '6h',
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
      labels: JSON.stringify(['Design', 'UI/UX', 'Flowdesk']),
      creatorId: priya.id,
      assignees: {
        create: [{ userId: priya.id }, { userId: david.id }],
      },
      subtasks: {
        create: [
          { title: 'Establish color palette and border tokens', isCompleted: true, order: 0 },
          { title: 'Design task modal split-view layout', isCompleted: true, order: 1 },
          { title: 'Implement image preview gallery inside task view', isCompleted: true, order: 2 },
          { title: 'Polish in-task real-time chat bubble styling', isCompleted: false, order: 3 },
        ],
      },
      attachments: {
        create: [
          {
            userId: priya.id,
            fileName: 'dashboard_mockup.png',
            fileUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
            fileType: 'image/png',
            fileSize: 245000,
            isImage: true,
          },
        ],
      },
      comments: {
        create: [
          {
            userId: priya.id,
            content: 'Updated the color variables to modern off-white #F8FAFC with slate-200 subtle borders.',
          },
          {
            userId: david.id,
            content: 'Looks super crisp! The generous whitespace really gives it a high-end feel.',
          },
        ],
      },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      workspaceId: teamWorkspace.id,
      listId: sprintList.id,
      columnId: cols['In Review'],
      taskNumber: 102,
      title: 'In-Task Real-Time Collaboration & Media Attachments',
      description:
        'Implement mini Slack-channel style in-task chat with Socket.io / Supabase Realtime, drag-and-drop file upload, and image lightbox viewer.',
      priority: 'URGENT',
      order: 2000,
      startDate: new Date(now.getTime() - 4 * day),
      dueDate: new Date(now.getTime() + 1 * day),
      timeEstimate: '8h 30m',
      labels: JSON.stringify(['Realtime', 'Backend', 'WebSockets']),
      creatorId: david.id,
      assignees: {
        create: [{ userId: david.id }, { userId: sarah.id }],
      },
      subtasks: {
        create: [
          { title: 'Set up room routing per taskId', isCompleted: true, order: 0 },
          { title: 'Add image attachment upload inside chat composer', isCompleted: true, order: 1 },
          { title: 'Test concurrent typing indicator and broadcast events', isCompleted: false, order: 2 },
        ],
      },
    },
  });

  const task3 = await prisma.task.create({
    data: {
      workspaceId: teamWorkspace.id,
      listId: sprintList.id,
      columnId: cols['To Do'],
      taskNumber: 103,
      title: 'Multi-View Switcher: Board, List, Calendar, Gantt',
      description: 'Ensure seamless switching between Kanban drag-and-drop, table view, month calendar, and horizontal timeline gantt schedule.',
      priority: 'MEDIUM',
      order: 3000,
      dueDate: new Date(now.getTime() + 5 * day),
      timeEstimate: '4h',
      labels: JSON.stringify(['Views', 'Frontend']),
      creatorId: alex.id,
      assignees: {
        create: [{ userId: alex.id }],
      },
    },
  });

  console.log('✓ Created Team Workspace with Spaces, Projects, and Tasks');

  // =========================================================================
  // WORKSPACE 2: PERSONAL WORKSPACE (Sarah Connor)
  // =========================================================================
  const personalWorkspace = await prisma.workspace.create({
    data: {
      name: 'Personal Focus (Sarah)',
      slug: 'sarah-personal',
      description: 'Solo productivity space for personal tasks, learning, and goals',
      type: 'PERSONAL',
      joinPolicy: 'INVITE_ONLY',
      plan: 'FREE',
      ownerId: sarah.id,
      logoUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=sarah-personal',
      members: {
        create: {
          userId: sarah.id,
          role: 'ADMIN',
        },
      },
      spaces: {
        create: {
          name: 'Personal Life & Focus',
          color: '#10B981',
          icon: 'user',
          projects: {
            create: {
              name: 'Quarterly OKRs & Goals',
              key: 'GOAL',
              description: 'Personal milestones, reading list, and habit tracking',
              color: '#10B981',
              lists: {
                create: {
                  name: 'Daily Priorities',
                  columns: {
                    create: [
                      { name: 'To Do', color: '#94A3B8', order: 0, isCompleted: false },
                      { name: 'In Progress', color: '#7B68EE', order: 1, isCompleted: false },
                      { name: 'Done', color: '#10B981', order: 2, isCompleted: true },
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

  const personalList = personalWorkspace.spaces[0].projects[0].lists[0];
  const personalCols = personalList.columns.reduce((acc, c) => {
    acc[c.name] = c.id;
    return acc;
  }, {} as Record<string, string>);

  await prisma.task.create({
    data: {
      workspaceId: personalWorkspace.id,
      listId: personalList.id,
      columnId: personalCols['In Progress'],
      taskNumber: 1,
      title: 'Review System Architecture & Database RLS Policies',
      description: 'Ensure all multi-tenant tables enforce strict Row Level Security at the PostgreSQL level.',
      priority: 'HIGH',
      order: 1000,
      dueDate: new Date(now.getTime() + 1 * day),
      timeEstimate: '3h',
      creatorId: sarah.id,
      assignees: {
        create: [{ userId: sarah.id }],
      },
      subtasks: {
        create: [
          { title: 'Audit workspaceId indexing', isCompleted: true, order: 0 },
          { title: 'Verify public community join links', isCompleted: true, order: 1 },
        ],
      },
    },
  });

  await prisma.task.create({
    data: {
      workspaceId: personalWorkspace.id,
      listId: personalList.id,
      columnId: personalCols['To Do'],
      taskNumber: 2,
      title: 'Read Clean Architecture by Uncle Bob',
      description: 'Deep dive into decoupled entity boundaries and hexagonal architecture.',
      priority: 'MEDIUM',
      order: 2000,
      dueDate: new Date(now.getTime() + 7 * day),
      timeEstimate: '5h',
      creatorId: sarah.id,
      assignees: {
        create: [{ userId: sarah.id }],
      },
    },
  });

  console.log('✓ Created Personal Workspace (Sarah) with private tasks');

  // =========================================================================
  // WORKSPACE 3: COMMUNITY WORKSPACE (Open Source Builders)
  // =========================================================================
  const communityWorkspace = await prisma.workspace.create({
    data: {
      name: 'Open Source Builders Community',
      slug: 'open-source-builders',
      description: 'Public community hub for open-source contributors, UI designers, and creators',
      type: 'COMMUNITY',
      joinPolicy: 'PUBLIC_LINK',
      plan: 'PRO',
      inviteCode: 'COMMUNITY-FLOWDESK-2026',
      logoUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=open-source-builders',
      ownerId: sarah.id,
      members: {
        create: [
          { userId: sarah.id, role: 'ADMIN' },
          { userId: alex.id, role: 'MANAGER' },
          { userId: david.id, role: 'MEMBER' },
          { userId: priya.id, role: 'MEMBER' },
          { userId: marcus.id, role: 'MEMBER' },
        ],
      },
      spaces: {
        create: {
          name: 'Community Hub',
          color: '#3B82F6',
          icon: 'users',
          projects: {
            create: {
              name: 'Flowdesk Component Library',
              key: 'UI',
              description: 'Open source Tailwind UI components and design systems',
              color: '#3B82F6',
              lists: {
                create: {
                  name: 'Component Bounties',
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

  const communityList = communityWorkspace.spaces[0].projects[0].lists[0];
  const communityCols = communityList.columns.reduce((acc, c) => {
    acc[c.name] = c.id;
    return acc;
  }, {} as Record<string, string>);

  await prisma.task.create({
    data: {
      workspaceId: communityWorkspace.id,
      listId: communityList.id,
      columnId: communityCols['In Review'],
      taskNumber: 10,
      title: 'Contribute Tailwind CSS v4 Animated Switcher',
      description: 'Create an accessible, keyboard-navigable view switcher component for Kanban, List, Calendar, and Timeline.',
      priority: 'MEDIUM',
      order: 1000,
      dueDate: new Date(now.getTime() + 3 * day),
      creatorId: marcus.id,
      assignees: {
        create: [{ userId: marcus.id }, { userId: priya.id }],
      },
      comments: {
        create: [
          {
            userId: marcus.id,
            content: 'PR #12 submitted with full TypeScript types and test coverage!',
          },
          {
            userId: priya.id,
            content: 'Testing in local playground, looks amazing on mobile!',
          },
        ],
      },
    },
  });

  await prisma.task.create({
    data: {
      workspaceId: communityWorkspace.id,
      listId: communityList.id,
      columnId: communityCols['To Do'],
      taskNumber: 11,
      title: 'Host Monthly Open Source Community Sync',
      description: 'Community demo day: showcase new plugins, themes, and integrations.',
      priority: 'LOW',
      order: 2000,
      dueDate: new Date(now.getTime() + 10 * day),
      creatorId: alex.id,
      assignees: {
        create: [{ userId: alex.id }],
      },
    },
  });

  console.log('✓ Created Community Workspace with public invite code COMMUNITY-FLOWDESK-2026');
  console.log('🎉 Multi-Tenant Database Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
