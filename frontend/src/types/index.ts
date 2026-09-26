export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type RecurrenceRule = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type NotificationType = 'ASSIGNMENT' | 'MENTION' | 'DUE_DATE' | 'COMMENT' | 'STATUS_CHANGE';
export type BoardView = 'kanban' | 'list' | 'calendar' | 'timeline';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: Role;
  notificationSettings?: Record<string, boolean>;
  workspaces?: {
    id: string;
    workspaceId: string;
    name: string;
    slug: string;
    role: Role;
    logoUrl?: string;
  }[];
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role: Role;
  };
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  ownerId: string;
  members?: WorkspaceMember[];
  spaces?: Space[];
  projects?: Project[];
  currentUserRole?: Role;
  _count?: {
    members: number;
    projects: number;
  };
}

export interface Space {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  icon?: string | null;
  order: number;
  projects?: Project[];
  workspace?: Workspace;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  spaceId?: string;
  workspaceId?: string;
  name: string;
  key: string;
  description?: string | null;
  color: string;
  icon?: string | null;
  order?: number;
  lists?: TaskList[];
  columns?: BoardColumn[];
  tasks?: Task[];
  space?: Space;
  workspace?: Workspace;
  _count?: {
    tasks: number;
    columns: number;
  };
}

export interface TaskList {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  order: number;
  columns?: BoardColumn[];
  tasks?: Task[];
  project?: Project;
  _count?: {
    tasks: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface BoardColumn {
  id: string;
  listId?: string;
  projectId?: string;
  name: string;
  color: string;
  order: number;
  isCompleted: boolean;
  tasks?: Task[];
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  createdAt: string;
}

export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  assignedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  };
}

export interface Attachment {
  id: string;
  taskId: string;
  uploadedById: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  isImage?: boolean;
  createdAt: string;
  uploadedBy?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export interface ActivityLog {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  details: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependsOnTask?: {
    id: string;
    title: string;
    taskNumber: number;
    priority: Priority;
    column?: { name: string; color: string; isCompleted: boolean };
  };
  task?: {
    id: string;
    title: string;
    taskNumber: number;
    priority: Priority;
  };
}

export interface Task {
  id: string;
  listId?: string;
  projectId?: string;
  columnId: string;
  taskNumber: number;
  title: string;
  description?: string | null;
  priority: Priority;
  order: number;
  startDate?: string | null;
  dueDate?: string | null;
  timeEstimate?: string | null;
  coverImage?: string | null;
  labels: string; // JSON string e.g. "[\"Design\"]"
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule;
  creatorId: string;
  createdAt: string;
  updatedAt: string;

  list?: TaskList;
  project?: {
    id: string;
    name: string;
    key: string;
    color: string;
    workspaceId?: string;
  };
  column?: {
    id: string;
    name: string;
    color: string;
    isCompleted: boolean;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  assignees?: TaskAssignee[];
  subtasks?: Subtask[];
  comments?: Comment[];
  attachments?: Attachment[];
  activityLogs?: ActivityLog[];
  blocking?: TaskDependency[];
  blockedBy?: TaskDependency[];
  _count?: {
    comments: number;
    attachments: number;
  };
}

export interface Notification {
  id: string;
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export interface FilterState {
  search: string;
  assigneeId: string;
  priority: string;
  status: string;
  label: string;
  quickView: 'all' | 'my_tasks' | 'overdue' | 'due_today' | 'due_this_week';
}
