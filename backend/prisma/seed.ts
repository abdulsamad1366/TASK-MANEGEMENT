/// <reference types="node" />
import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ClickUp-style database seed...');

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

  // 2. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme Technologies',
      slug: 'acme-tech',
      description: 'Primary product & engineering workspace',
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

  // 3. Create ClickUp Spaces
  const engineeringSpace = await prisma.space.create({
    data: {
      workspaceId: workspace.id,
      name: 'Engineering',
      color: '#7B68EE', // ClickUp purple
      icon: 'code',
      order: 0,
    },
  });

  const productSpace = await prisma.space.create({
    data: {
      workspaceId: workspace.id,
      name: 'Product & Design',
      color: '#06B6D4',
      icon: 'sparkles',
      order: 1,
    },
  });

  console.log('✓ Created ClickUp Spaces (Engineering, Product & Design)');

  // 4. Create Project within Engineering Space
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

  const backendProject = await prisma.project.create({
    data: {
      spaceId: engineeringSpace.id,
      name: 'API Infrastructure',
      key: 'API',
      description: 'High-concurrency microservices and Socket gateway',
      color: '#10B981',
      icon: 'server',
      order: 1,
    },
  });

  console.log('✓ Created Projects (Mobile App 3.0, API Infrastructure)');

  // 5. Create Lists within Project
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

  const backlogList = await prisma.taskList.create({
    data: {
      projectId: mobileProject.id,
      name: 'Product Backlog',
      description: 'Future roadmap enhancements',
      order: 1,
      columns: {
        create: [
          { name: 'To Do', color: '#94A3B8', order: 0, isCompleted: false },
          { name: 'In Progress', color: '#7B68EE', order: 1, isCompleted: false },
          { name: 'Done', color: '#10B981', order: 2, isCompleted: true },
        ],
      },
    },
    include: { columns: true },
  });

  console.log('✓ Created Task Lists with Custom Statuses');

  // Columns dictionary
  const cols = sprintList.columns.reduce((acc, col) => {
    acc[col.name] = col.id;
    return acc;
  }, {} as Record<string, string>);

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  // 6. Create Tasks with In-Task Chat & Images
  const task1 = await prisma.task.create({
    data: {
      listId: sprintList.id,
      columnId: cols['In Progress'],
      taskNumber: 101,
      title: 'Design Clean Light UI Theme & Design Tokens',
      description:
        'Create a light, minimal UI inspired by ClickUp with generous whitespace, subtle borders, and signature purple accents.\n\n### Requirements:\n- Soft off-white backgrounds (#FAFAFA / #FFFFFF)\n- ClickUp purple accent (#7B68EE)\n- Clean sans-serif typography with high contrast',
      priority: 'HIGH',
      order: 1000,
      startDate: new Date(now.getTime() - 2 * day),
      dueDate: new Date(now.getTime() + 2 * day),
      timeEstimate: '6h',
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
      labels: JSON.stringify(['Design', 'UI/UX', 'ClickUp-Style']),
      creatorId: priya.id,
      assignees: {
        create: [{ userId: priya.id }, { userId: david.id }],
      },
      subtasks: {
        create: [
          { title: 'Establish color palette and border tokens', isCompleted: true, order: 0 },
          { title: 'Design ClickUp task modal split-view layout', isCompleted: true, order: 1 },
          { title: 'Implement image preview gallery inside task view', isCompleted: true, order: 2 },
          { title: 'Polish in-task real-time chat bubble styling', isCompleted: false, order: 3 },
        ],
      },
      attachments: {
        create: [
          {
            uploadedById: priya.id,
            fileName: 'dashboard_mockup.png',
            fileUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
            fileType: 'image/png',
            fileSize: 245000,
            isImage: true,
          },
          {
            uploadedById: priya.id,
            fileName: 'design_specs_v3.pdf',
            fileUrl: 'https://example.com/specs.pdf',
            fileType: 'application/pdf',
            fileSize: 1024000,
            isImage: false,
          },
        ],
      },
      comments: {
        create: [
          {
            userId: priya.id,
            content: 'Hey @Alex, I uploaded the initial design preview image above. The light theme feels so clean!',
            imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600',
            createdAt: new Date(now.getTime() - 1 * day),
          },
          {
            userId: alex.id,
            content: 'Looks fantastic Priya! Love the whitespace and the in-task chat feels like a true mini Slack channel.',
            createdAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      listId: sprintList.id,
      columnId: cols['In Progress'],
      taskNumber: 102,
      title: 'In-Task Real-time Chat Gateway & Image Upload',
      description:
        'Implement Socket.io room broadcasting for every single task so team members can chat, share screenshots, and receive instant @mention notifications while authoring or editing tasks.',
      priority: 'URGENT',
      order: 2000,
      startDate: new Date(now.getTime() - 1 * day),
      dueDate: new Date(now.getTime() + 1 * day),
      timeEstimate: '8h',
      labels: JSON.stringify(['Sockets', 'Chat', 'Realtime']),
      creatorId: david.id,
      assignees: {
        create: [{ userId: david.id }],
      },
      subtasks: {
        create: [
          { title: 'Create in-task chat room handlers on Socket.io', isCompleted: true, order: 0 },
          { title: 'Support in-chat image attachment sharing', isCompleted: true, order: 1 },
          { title: 'Trigger instant notifications for @mentions', isCompleted: true, order: 2 },
        ],
      },
      comments: {
        create: [
          {
            userId: david.id,
            content: 'Socket room `task:${taskId}` is active. Live chat messages and attachments now broadcast in real time!',
            createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  const task3 = await prisma.task.create({
    data: {
      listId: sprintList.id,
      columnId: cols['To Do'],
      taskNumber: 103,
      title: 'ClickUp Multi-View Switcher: Board, List, Calendar, Gantt',
      description:
        'Ensure seamless switching between Kanban drag-and-drop, ClickUp table/list view, month calendar, and horizontal timeline gantt schedule.',
      priority: 'HIGH',
      order: 1000,
      startDate: new Date(now.getTime() + 1 * day),
      dueDate: new Date(now.getTime() + 4 * day),
      timeEstimate: '4h',
      labels: JSON.stringify(['Views', 'Kanban', 'Gantt']),
      creatorId: sarah.id,
      assignees: {
        create: [{ userId: marcus.id }],
      },
    },
  });

  const task4 = await prisma.task.create({
    data: {
      listId: sprintList.id,
      columnId: cols['Done'],
      taskNumber: 104,
      title: 'Workspace > Space > Project > List Hierarchy Schema',
      description: 'Modeled database relational tables matching ClickUp 5-tier organization hierarchy with Prisma.',
      priority: 'HIGH',
      order: 1000,
      dueDate: new Date(now.getTime() - 1 * day),
      timeEstimate: '5h',
      labels: JSON.stringify(['Prisma', 'Database', 'Schema']),
      creatorId: sarah.id,
      assignees: {
        create: [{ userId: sarah.id }, { userId: david.id }],
      },
      subtasks: {
        create: [
          { title: 'Draft Prisma relational hierarchy', isCompleted: true, order: 0 },
          { title: 'Add in-task chat image support to Comment model', isCompleted: true, order: 1 },
          { title: 'Separate ActivityLog audit trail from user chat', isCompleted: true, order: 2 },
        ],
      },
    },
  });

  // Task Dependency
  await prisma.taskDependency.create({
    data: {
      taskId: task3.id,
      dependsOnTaskId: task1.id,
    },
  });

  // Activity Logs (Audit trail separate from chat comments)
  await prisma.activityLog.createMany({
    data: [
      {
        taskId: task1.id,
        userId: priya.id,
        action: 'TASK_CREATED',
        details: JSON.stringify({ message: 'Task created' }),
        createdAt: new Date(now.getTime() - 2 * day),
      },
      {
        taskId: task1.id,
        userId: priya.id,
        action: 'STATUS_CHANGED',
        details: JSON.stringify({ from: 'To Do', to: 'In Progress' }),
        createdAt: new Date(now.getTime() - 1 * day),
      },
      {
        taskId: task2.id,
        userId: david.id,
        action: 'PRIORITY_CHANGED',
        details: JSON.stringify({ from: 'HIGH', to: 'URGENT' }),
        createdAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      },
      {
        taskId: task4.id,
        userId: sarah.id,
        action: 'STATUS_CHANGED',
        details: JSON.stringify({ from: 'In Review', to: 'Done' }),
        createdAt: new Date(now.getTime() - 1 * day),
      },
    ],
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: alex.id,
        actorId: priya.id,
        type: 'CHAT',
        title: 'New chat in APP-101',
        message: 'Priya Patel: "Hey @Alex, I uploaded the initial design preview image..."',
        entityType: 'TASK',
        entityId: task1.id,
        isRead: false,
      },
      {
        userId: sarah.id,
        actorId: david.id,
        type: 'ASSIGNMENT',
        title: 'Assigned to In-Task Chat Gateway',
        message: 'David Chen added you to APP-102',
        entityType: 'TASK',
        entityId: task2.id,
        isRead: false,
      },
    ],
  });

  console.log('✓ Created sample tasks, in-task chat threads with images, checklists, and separate activity logs');
  console.log('🎉 ClickUp-style database successfully seeded!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
