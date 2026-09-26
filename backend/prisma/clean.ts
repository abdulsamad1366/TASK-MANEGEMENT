import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning all dummy data from database...');

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

  console.log('✨ All dummy data successfully removed! Database is pristine and ready for real projects.');
}

main()
  .catch((e) => {
    console.error('Error cleaning database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
