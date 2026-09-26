-- Flowdesk: Multi-Tenant Schema with Row Level Security (RLS), Supabase Storage & Realtime

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RecurrenceRule" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('ASSIGNMENT', 'MENTION', 'DUE_DATE', 'CHAT', 'STATUS_CHANGE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'COMMUNITY', 'TEAM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkspaceJoinPolicy" AS ENUM ('INVITE_ONLY', 'PUBLIC_LINK', 'REQUEST_TO_JOIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkspacePlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Core Users Table
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "role" "Role" DEFAULT 'MEMBER' NOT NULL,
  "notificationSettings" TEXT DEFAULT '{"email":true,"assignments":true,"comments":true,"mentions":true,"dueDates":true,"chat":true}',
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Multi-Tenant Workspaces Table
CREATE TABLE IF NOT EXISTS "Workspace" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "logoUrl" TEXT,
  "type" "WorkspaceType" DEFAULT 'TEAM' NOT NULL,
  "joinPolicy" "WorkspaceJoinPolicy" DEFAULT 'INVITE_ONLY' NOT NULL,
  "plan" "WorkspacePlan" DEFAULT 'FREE' NOT NULL,
  "inviteCode" TEXT UNIQUE,
  "maxMembers" INTEGER DEFAULT 50 NOT NULL,
  "storageLimitMb" INTEGER DEFAULT 1000 NOT NULL,
  "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Workspace Members (Tenant Membership Mapping)
CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role" "Role" DEFAULT 'MEMBER' NOT NULL,
  "joinedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "unique_workspace_member" UNIQUE ("workspaceId", "userId")
);

-- 5. Workspace Invitations
CREATE TABLE IF NOT EXISTS "WorkspaceInvitation" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "role" "Role" DEFAULT 'MEMBER' NOT NULL,
  "token" TEXT UNIQUE NOT NULL,
  "status" "InvitationStatus" DEFAULT 'PENDING' NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. ClickUp / Flowdesk Spaces (Scoring high-level departments)
CREATE TABLE IF NOT EXISTS "Space" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "color" TEXT DEFAULT '#7B68EE' NOT NULL,
  "icon" TEXT DEFAULT 'rocket',
  "order" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Projects
CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT PRIMARY KEY,
  "spaceId" TEXT NOT NULL REFERENCES "Space"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT DEFAULT '#7B68EE' NOT NULL,
  "icon" TEXT DEFAULT 'folder',
  "order" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "unique_space_key" UNIQUE ("spaceId", "key")
);

-- 8. Lists
CREATE TABLE IF NOT EXISTS "TaskList" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. Board Columns (Custom Statuses)
CREATE TABLE IF NOT EXISTS "BoardColumn" (
  "id" TEXT PRIMARY KEY,
  "listId" TEXT NOT NULL REFERENCES "TaskList"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "color" TEXT DEFAULT '#94a3b8' NOT NULL,
  "order" INTEGER DEFAULT 0 NOT NULL,
  "isCompleted" BOOLEAN DEFAULT FALSE NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 10. Multi-Tenant Tasks
CREATE TABLE IF NOT EXISTS "Task" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
  "listId" TEXT NOT NULL REFERENCES "TaskList"("id") ON DELETE CASCADE,
  "columnId" TEXT NOT NULL REFERENCES "BoardColumn"("id") ON DELETE CASCADE,
  "taskNumber" INTEGER DEFAULT 1 NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" "Priority" DEFAULT 'MEDIUM' NOT NULL,
  "order" DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "startDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "timeEstimate" TEXT,
  "coverImage" TEXT,
  "labels" TEXT DEFAULT '[]' NOT NULL,
  "isRecurring" BOOLEAN DEFAULT FALSE NOT NULL,
  "recurrenceRule" "RecurrenceRule" DEFAULT 'NONE' NOT NULL,
  "creatorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_task_workspace" ON "Task"("workspaceId");
CREATE INDEX IF NOT EXISTS "idx_task_list_col" ON "Task"("listId", "columnId");

-- 11. Task Assignees
CREATE TABLE IF NOT EXISTS "TaskAssignee" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "unique_task_assignee" UNIQUE ("taskId", "userId")
);

-- 12. Subtasks
CREATE TABLE IF NOT EXISTS "Subtask" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "isCompleted" BOOLEAN DEFAULT FALSE NOT NULL,
  "order" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 13. Task Dependencies
CREATE TABLE IF NOT EXISTS "TaskDependency" (
  "id" TEXT PRIMARY KEY,
  "blockingTaskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "blockedTaskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "unique_dependency" UNIQUE ("blockingTaskId", "blockedTaskId")
);

-- 14. In-Task Chat Comments
CREATE TABLE IF NOT EXISTS "Comment" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 15. Task Attachments
CREATE TABLE IF NOT EXISTS "Attachment" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileType" TEXT NOT NULL,
  "isImage" BOOLEAN DEFAULT FALSE NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 16. Activity Audit Logs
CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 17. Notifications
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityId" TEXT,
  "isRead" BOOLEAN DEFAULT FALSE NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_notif_user" ON "Notification"("userId", "isRead");

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) MULTI-TENANT POLICIES
-- ==============================================================================

-- Enable RLS across all multi-tenant tables
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Space" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BoardColumn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is a member of workspace
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "WorkspaceMember"
    WHERE "workspaceId" = ws_id
      AND "userId" = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Workspace Policies
DROP POLICY IF EXISTS "Members can view workspaces" ON "Workspace";
CREATE POLICY "Members can view workspaces" ON "Workspace"
  FOR SELECT
  USING (
    "type" = 'COMMUNITY'
    OR "ownerId" = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember"
      WHERE "WorkspaceMember"."workspaceId" = "Workspace"."id"
        AND "WorkspaceMember"."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update workspace" ON "Workspace";
CREATE POLICY "Owners and admins can update workspace" ON "Workspace"
  FOR UPDATE
  USING (
    "ownerId" = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember"
      WHERE "WorkspaceMember"."workspaceId" = "Workspace"."id"
        AND "WorkspaceMember"."userId" = auth.uid()::text
        AND "WorkspaceMember"."role" IN ('ADMIN')
    )
  );

-- 2. Space Policies
DROP POLICY IF EXISTS "Workspace members can access spaces" ON "Space";
CREATE POLICY "Workspace members can access spaces" ON "Space"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "WorkspaceMember"
      WHERE "WorkspaceMember"."workspaceId" = "Space"."workspaceId"
        AND "WorkspaceMember"."userId" = auth.uid()::text
    )
  );

-- 3. Project Policies
DROP POLICY IF EXISTS "Workspace members can access projects" ON "Project";
CREATE POLICY "Workspace members can access projects" ON "Project"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Space"
      JOIN "WorkspaceMember" ON "WorkspaceMember"."workspaceId" = "Space"."workspaceId"
      WHERE "Space"."id" = "Project"."spaceId"
        AND "WorkspaceMember"."userId" = auth.uid()::text
    )
  );

-- 4. TaskList Policies
DROP POLICY IF EXISTS "Workspace members can access task lists" ON "TaskList";
CREATE POLICY "Workspace members can access task lists" ON "TaskList"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Project"
      JOIN "Space" ON "Space"."id" = "Project"."spaceId"
      JOIN "WorkspaceMember" ON "WorkspaceMember"."workspaceId" = "Space"."workspaceId"
      WHERE "Project"."id" = "TaskList"."projectId"
        AND "WorkspaceMember"."userId" = auth.uid()::text
    )
  );

-- 5. Task Policies (Direct workspaceId scoping for maximum RLS performance)
DROP POLICY IF EXISTS "Workspace members can access tasks" ON "Task";
CREATE POLICY "Workspace members can access tasks" ON "Task"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "WorkspaceMember"
      WHERE "WorkspaceMember"."workspaceId" = "Task"."workspaceId"
        AND "WorkspaceMember"."userId" = auth.uid()::text
    )
  );

-- 6. Comment Policies
DROP POLICY IF EXISTS "Task chat access" ON "Comment";
CREATE POLICY "Task chat access" ON "Comment"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Task"
      JOIN "WorkspaceMember" ON "WorkspaceMember"."workspaceId" = "Task"."workspaceId"
      WHERE "Task"."id" = "Comment"."taskId"
        AND "WorkspaceMember"."userId" = auth.uid()::text
    )
  );

-- 7. Notification Policies
DROP POLICY IF EXISTS "Users can only read own notifications" ON "Notification";
CREATE POLICY "Users can only read own notifications" ON "Notification"
  FOR ALL
  USING ("userId" = auth.uid()::text);

-- ==============================================================================
-- SUPABASE STORAGE BUCKET & REALTIME SETUP
-- ==============================================================================

-- Create attachments storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public read access
DROP POLICY IF EXISTS "Public can view attachments" ON storage.objects;
CREATE POLICY "Public can view attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments');

-- Storage RLS: Authenticated users can upload
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attachments');

-- Add core tables to Supabase Realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "Task", "Comment", "Notification", "BoardColumn";
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
