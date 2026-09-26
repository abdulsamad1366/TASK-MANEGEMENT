import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.task.deleteMany();
  await prisma.boardColumn.deleteMany();
  await prisma.project.deleteMany();
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

  console.log('✓ Created 5 demo users');

  // 2. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme Technologies',
      slug: 'acme-tech',
      description: 'Primary engineering and product organization workspace',
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

  console.log(`✓ Created workspace: ${workspace.name}`);

  // 3. Create Projects
  const project1 = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: 'Mobile App Redesign',
      key: 'APP',
      description: 'Rebuilding the iOS and Android mobile app with React Native and modern sleek UX',
      color: '#6366f1', // Indigo
      icon: 'smartphone',
      columns: {
        create: [
          { name: 'Backlog', color: '#94a3b8', order: 0, isCompleted: false },
          { name: 'To Do', color: '#3b82f6', order: 1, isCompleted: false },
          { name: 'In Progress', color: '#8b5cf6', order: 2, isCompleted: false },
          { name: 'In Review', color: '#ec4899', order: 3, isCompleted: false },
          { name: 'Done', color: '#10b981', order: 4, isCompleted: true },
        ],
      },
    },
    include: { columns: true },
  });

  const project2 = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: 'Cloud Infrastructure 2.0',
      key: 'OPS',
      description: 'Migrating microservices to Kubernetes and optimizing Supabase database read replicas',
      color: '#06b6d4', // Cyan
      icon: 'cloud',
      columns: {
        create: [
          { name: 'To Do', color: '#3b82f6', order: 0, isCompleted: false },
          { name: 'In Progress', color: '#8b5cf6', order: 1, isCompleted: false },
          { name: 'Testing', color: '#f59e0b', order: 2, isCompleted: false },
          { name: 'Done', color: '#10b981', order: 3, isCompleted: true },
        ],
      },
    },
    include: { columns: true },
  });

  console.log('✓ Created 2 projects with custom columns');

  // Columns for project 1
  const cols = project1.columns.reduce((acc, col) => {
    acc[col.name] = col.id;
    return acc;
  }, {} as Record<string, string>);

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  // 4. Create Tasks in Project 1
  const task1 = await prisma.task.create({
    data: {
      projectId: project1.id,
      columnId: cols['In Progress'],
      taskNumber: 101,
      title: 'Design Dark Mode System & Color Tokens',
      description: 'Establish cohesive dark/light design tokens in Figma and export CSS variable mappings for the Tailwind theme.',
      priority: 'HIGH',
      order: 1000,
      startDate: new Date(now.getTime() - 2 * day),
      dueDate: new Date(now.getTime() + 3 * day),
      labels: JSON.stringify(['Design', 'UI/UX', 'v2.0']),
      creatorId: alex.id,
      assignees: {
        create: [{ userId: priya.id }, { userId: david.id }],
      },
      subtasks: {
        create: [
          { title: 'Audit current color contrast ratios', isCompleted: true, order: 0 },
          { title: 'Define HSL semantic tokens for dark theme', isCompleted: true, order: 1 },
          { title: 'Implement Tailwind config custom extensions', isCompleted: false, order: 2 },
          { title: 'Verify accessible text contrast in mobile view', isCompleted: false, order: 3 },
        ],
      },
      comments: {
        create: [
          {
            userId: priya.id,
            content: 'Working on the Figma tokens right now! The contrast on muted text looks much cleaner now.',
          },
          {
            userId: alex.id,
            content: 'Awesome! Please make sure to check OLED dark black (#090D16) for battery saving on mobile.',
          },
        ],
      },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      projectId: project1.id,
      columnId: cols['In Progress'],
      taskNumber: 102,
      title: 'Implement Real-time WebSocket Gateway',
      description: 'Integrate Socket.io with Express and broadcast task updates, drag-and-drop reordering, and team member presence.',
      priority: 'URGENT',
      order: 2000,
      startDate: new Date(now.getTime() - 1 * day),
      dueDate: new Date(now.getTime() + 1 * day),
      labels: JSON.stringify(['Backend', 'Realtime', 'Sockets']),
      creatorId: sarah.id,
      assignees: {
        create: [{ userId: david.id }],
      },
      subtasks: {
        create: [
          { title: 'Setup Socket.io connection handshake with JWT auth', isCompleted: true, order: 0 },
          { title: 'Create project room subscription handlers', isCompleted: true, order: 1 },
          { title: 'Broadcast task:moved and task:updated events', isCompleted: false, order: 2 },
        ],
      },
      comments: {
        create: [
          {
            userId: david.id,
            content: 'Handshake auth via JWT is working. Ready to wire up board optimistic listeners.',
          },
        ],
      },
    },
  });

  const task3 = await prisma.task.create({
    data: {
      projectId: project1.id,
      columnId: cols['To Do'],
      taskNumber: 103,
      title: 'Biometric FaceID / TouchID Authentication',
      description: 'Support seamless biometric fast-login on mobile devices with fallback to JWT refresh tokens.',
      priority: 'MEDIUM',
      order: 1000,
      startDate: new Date(now.getTime() + 1 * day),
      dueDate: new Date(now.getTime() + 5 * day),
      labels: JSON.stringify(['Mobile', 'Security', 'Auth']),
      creatorId: alex.id,
      assignees: {
        create: [{ userId: marcus.id }],
      },
      subtasks: {
        create: [
          { title: 'Investigate Expo LocalAuthentication API', isCompleted: false, order: 0 },
          { title: 'Create fallback PIN screen', isCompleted: false, order: 1 },
        ],
      },
    },
  });

  const task4 = await prisma.task.create({
    data: {
      projectId: project1.id,
      columnId: cols['To Do'],
      taskNumber: 104,
      title: 'Offline Sync & Cache Layer with SQLite / WatermelonDB',
      description: 'Allow users to browse and edit boards offline, then reconcile state automatically upon reconnect.',
      priority: 'LOW',
      order: 2000,
      dueDate: new Date(now.getTime() + 10 * day),
      labels: JSON.stringify(['Mobile', 'Offline', 'Architecture']),
      creatorId: sarah.id,
      assignees: {
        create: [{ userId: david.id }],
      },
    },
  });

  const task5 = await prisma.task.create({
    data: {
      projectId: project1.id,
      columnId: cols['In Review'],
      taskNumber: 105,
      title: 'Kanban Drag-and-Drop Column Reordering',
      description: 'Enable fluid column reordering and task card positioning with optimistic visual updates and spring animations.',
      priority: 'HIGH',
      order: 1000,
      startDate: new Date(now.getTime() - 4 * day),
      dueDate: new Date(now.getTime() + 2 * day),
      labels: JSON.stringify(['Frontend', 'Kanban', 'UX']),
      creatorId: alex.id,
      assignees: {
        create: [{ userId: priya.id }],
      },
      subtasks: {
        create: [
          { title: 'Install drag-and-drop toolkit', isCompleted: true, order: 0 },
          { title: 'Implement smooth drag handle and drop placeholder', isCompleted: true, order: 1 },
          { title: 'Calculate fractional orders on drop', isCompleted: true, order: 2 },
          { title: 'Keyboard accessible drag and drop', isCompleted: false, order: 3 },
        ],
      },
    },
  });

  const task6 = await prisma.task.create({
    data: {
      projectId: project1.id,
      columnId: cols['Done'],
      taskNumber: 106,
      title: 'Database Schema & Relational Modeling',
      description: 'Configure Prisma models with PostgreSQL and SQLite schemas, foreign key cascades, and indexes.',
      priority: 'HIGH',
      order: 1000,
      startDate: new Date(now.getTime() - 5 * day),
      dueDate: new Date(now.getTime() - 1 * day),
      labels: JSON.stringify(['Database', 'Prisma', 'PostgreSQL']),
      creatorId: sarah.id,
      assignees: {
        create: [{ userId: sarah.id }, { userId: alex.id }],
      },
      subtasks: {
        create: [
          { title: 'Draft entity relationship diagrams', isCompleted: true, order: 0 },
          { title: 'Setup Prisma schema with relations', isCompleted: true, order: 1 },
          { title: 'Write automated seed script', isCompleted: true, order: 2 },
        ],
      },
    },
  });

  const task7 = await prisma.task.create({
    data: {
      projectId: project1.id,
      columnId: cols['Backlog'],
      taskNumber: 107,
      title: 'Burndown Chart & Velocity Analytics',
      description: 'Compute sprint velocity, task completion rate over time, and render interactive burndown SVG/canvas charts.',
      priority: 'MEDIUM',
      order: 1000,
      dueDate: new Date(now.getTime() + 14 * day),
      labels: JSON.stringify(['Analytics', 'Reporting']),
      creatorId: alex.id,
    },
  });

  // 5. Create Task Dependency (task2 blocks task5)
  await prisma.taskDependency.create({
    data: {
      taskId: task5.id,
      dependsOnTaskId: task2.id,
    },
  });

  // 6. Create Activity Logs
  await prisma.activityLog.createMany({
    data: [
      {
        taskId: task1.id,
        userId: alex.id,
        action: 'CREATED',
        details: JSON.stringify({ message: 'Task created' }),
        createdAt: new Date(now.getTime() - 2 * day),
      },
      {
        taskId: task1.id,
        userId: priya.id,
        action: 'STATUS_CHANGE',
        details: JSON.stringify({ from: 'To Do', to: 'In Progress' }),
        createdAt: new Date(now.getTime() - 1 * day),
      },
      {
        taskId: task2.id,
        userId: sarah.id,
        action: 'PRIORITY_CHANGE',
        details: JSON.stringify({ from: 'HIGH', to: 'URGENT' }),
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
      {
        taskId: task6.id,
        userId: sarah.id,
        action: 'STATUS_CHANGE',
        details: JSON.stringify({ from: 'In Review', to: 'Done' }),
        createdAt: new Date(now.getTime() - 1 * day),
      },
    ],
  });

  // 7. Create Demo Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: sarah.id,
        actorId: priya.id,
        type: 'COMMENT',
        title: 'New comment on APP-101',
        message: 'Priya Patel commented: "Working on the Figma tokens right now!"',
        entityType: 'TASK',
        entityId: task1.id,
        isRead: false,
      },
      {
        userId: sarah.id,
        actorId: alex.id,
        type: 'ASSIGNMENT',
        title: 'Assigned to Database Schema',
        message: 'Alex Rivera assigned you to APP-106 Database Schema & Relational Modeling',
        entityType: 'TASK',
        entityId: task6.id,
        isRead: true,
      },
      {
        userId: sarah.id,
        actorId: david.id,
        type: 'MENTION',
        title: 'Mentioned in APP-102',
        message: 'David Chen mentioned you in APP-102 Real-time WebSocket Gateway',
        entityType: 'TASK',
        entityId: task2.id,
        isRead: false,
      },
    ],
  });

  console.log('✓ Created rich seed tasks, subtasks, dependencies, activity logs, and notifications');
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
