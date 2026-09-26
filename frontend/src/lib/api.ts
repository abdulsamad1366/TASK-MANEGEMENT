const getApiBaseUrl = (): string => {
  let envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    // If page is on HTTPS, ensure envUrl is also HTTPS (prevents redirects that strip auth headers)
    if (envUrl && window.location.protocol === 'https:' && envUrl.startsWith('http://') && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      envUrl = envUrl.replace('http://', 'https://');
    }
    if (envUrl) {
      envUrl = envUrl.replace(/\/+$/, '');
    }

    // If running in browser on mobile or non-localhost host, bypass localhost env URL
    if (envUrl && envUrl.includes('localhost') && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '/api';
    }
    if (envUrl) {
      return envUrl;
    }
    // In browser (desktop or mobile), relative /api routes smoothly through Next.js proxy
    return '/api';
  }
  let fallback = envUrl || (process.env.BACKEND_URL ? `${process.env.BACKEND_URL.replace(/\/+$/, '')}/api` : 'http://localhost:5001/api');
  return fallback.replace(/\/+$/, '');
};

class ApiClient {
  private getHeaders(isFormData = false): HeadersInit {
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('task_access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-access-token'] = token;
      }
    }

    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    const isFormData = options.body instanceof FormData;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(isFormData),
        ...(options.headers || {}),
      },
    });

    if (response.status === 401 && typeof window !== 'undefined') {
      // Try refresh token if available
      const refreshToken = localStorage.getItem('task_refresh_token');
      if (refreshToken && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        try {
          const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('task_access_token', data.tokens.accessToken);
            localStorage.setItem('task_refresh_token', data.tokens.refreshToken);

            // Retry original request
            return this.request<T>(endpoint, options);
          }
        } catch {
          // Token refresh failed
        }
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  }

  // Auth endpoints
  login = (credentials: { email: string; password: string; inviteToken?: string }) =>
    this.request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });

  register = (userData: {
    email: string;
    password: string;
    name: string;
    role?: string;
    inviteToken?: string;
    createDefaultWorkspace?: boolean;
  }) => this.request<any>('/auth/register', { method: 'POST', body: JSON.stringify(userData) });

  getMe = () => this.request<any>('/auth/me');

  updateProfile = (profileData: any) =>
    this.request<any>('/auth/profile', { method: 'PATCH', body: JSON.stringify(profileData) });

  forgotPassword = (email: string) =>
    this.request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });

  resetPassword = (data: { token: string; newPassword: string }) =>
    this.request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) });

  // Workspace endpoints
  getWorkspaces = () => this.request<any>('/workspaces');
  getWorkspace = (id: string) => this.request<any>(`/workspaces/${id}`);
  createWorkspace = (data: any) => this.request<any>('/workspaces', { method: 'POST', body: JSON.stringify(data) });
  joinWorkspace = (data: { inviteCode?: string; workspaceId?: string; slug?: string }) =>
    this.request<any>('/workspaces/join', { method: 'POST', body: JSON.stringify(data) });
  getMyGlobalTasks = () => this.request<{ tasks: any[] }>('/tasks/my-tasks');
  updateWorkspace = (id: string, data: any) =>
    this.request<any>(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  inviteMember = (workspaceId: string, data: { email: string; role: string }) =>
    this.request<any>(`/workspaces/${workspaceId}/invite`, { method: 'POST', body: JSON.stringify(data) });
  batchInviteMembers = (
    workspaceId: string,
    data: { invites?: { email: string; role?: string }[]; emails?: string[]; role?: string }
  ) =>
    this.request<any>(`/workspaces/${workspaceId}/invites/batch`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  revokeInvitation = (workspaceId: string, inviteId: string) =>
    this.request<any>(`/workspaces/${workspaceId}/invites/${inviteId}`, { method: 'DELETE' });
  regenerateInviteCode = (workspaceId: string) =>
    this.request<any>(`/workspaces/${workspaceId}/join-link/regenerate`, { method: 'POST' });

  // Join Requests (Public link approval architecture)
  getJoinInfo = (slug: string) =>
    this.request<{ workspace: any }>(`/workspaces/join-info/${slug}`);
  requestToJoin = (slug: string) =>
    this.request<any>(`/workspaces/join/${slug}/request`, { method: 'POST' });
  getJoinRequests = (workspaceId: string) =>
    this.request<{ requests: any[] }>(`/workspaces/${workspaceId}/join-requests`);
  approveJoinRequest = (workspaceId: string, requestId: string, role: string = 'MEMBER') =>
    this.request<any>(`/workspaces/${workspaceId}/join-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  denyJoinRequest = (workspaceId: string, requestId: string) =>
    this.request<any>(`/workspaces/${workspaceId}/join-requests/${requestId}/deny`, {
      method: 'POST',
    });

  // Invitations
  getInvitation = (token: string) => this.request<any>(`/invitations/${token}`);
  acceptInvitation = (token: string) =>
    this.request<any>(`/invitations/${token}/accept`, { method: 'POST' });
  updateMemberRole = (workspaceId: string, memberId: string, role: string) =>
    this.request<any>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  removeMember = (workspaceId: string, memberId: string) =>
    this.request<any>(`/workspaces/${workspaceId}/members/${memberId}`, { method: 'DELETE' });

  // ClickUp Hierarchy: Workspace > Spaces > Projects > Lists
  getHierarchy = (workspaceId: string) =>
    this.request<{ spaces: any[] }>(`/workspaces/${workspaceId}/hierarchy`);
  createSpace = (workspaceId: string, data: { name: string; color?: string; icon?: string }) =>
    this.request<any>(`/workspaces/${workspaceId}/spaces`, { method: 'POST', body: JSON.stringify(data) });
  updateSpace = (spaceId: string, data: any) =>
    this.request<any>(`/spaces/${spaceId}`, { method: 'PATCH', body: JSON.stringify(data) });
  deleteSpace = (spaceId: string) =>
    this.request<any>(`/spaces/${spaceId}`, { method: 'DELETE' });

  createProjectInSpace = (spaceId: string, data: any) =>
    this.request<any>(`/spaces/${spaceId}/projects`, { method: 'POST', body: JSON.stringify(data) });

  createTaskList = (projectId: string, data: any) =>
    this.request<any>(`/projects/${projectId}/lists`, { method: 'POST', body: JSON.stringify(data) });
  getTaskList = (listId: string) =>
    this.request<{ list: any }>(`/lists/${listId}`);
  updateTaskList = (listId: string, data: any) =>
    this.request<any>(`/lists/${listId}`, { method: 'PATCH', body: JSON.stringify(data) });
  deleteTaskList = (listId: string) =>
    this.request<any>(`/lists/${listId}`, { method: 'DELETE' });

  // List Column Management
  createListColumn = (listId: string, data: any) =>
    this.request<any>(`/lists/${listId}/columns`, { method: 'POST', body: JSON.stringify(data) });
  updateListColumn = (columnId: string, data: any) =>
    this.request<any>(`/columns/${columnId}`, { method: 'PATCH', body: JSON.stringify(data) });
  deleteListColumn = (columnId: string) =>
    this.request<any>(`/columns/${columnId}`, { method: 'DELETE' });

  // Project endpoints (legacy/compat)
  getProjects = (workspaceId: string) => this.request<any>(`/projects?workspaceId=${workspaceId}`);
  getProject = (id: string) => this.request<any>(`/projects/${id}`);
  createProject = (data: any) => this.request<any>('/projects', { method: 'POST', body: JSON.stringify(data) });
  updateProject = (id: string, data: any) =>
    this.request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  deleteProject = (id: string) => this.request<any>(`/projects/${id}`, { method: 'DELETE' });

  // Task endpoints
  getTasks = (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return this.request<any>(`/tasks${qs ? `?${qs}` : ''}`);
  };
  getTask = (id: string) => this.request<any>(`/tasks/${id}`);
  createTask = (data: any) => this.request<any>('/tasks', { method: 'POST', body: JSON.stringify(data) });
  updateTask = (id: string, data: any) =>
    this.request<any>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  moveTask = (id: string, data: { columnId: string; order: number }) =>
    this.request<any>(`/tasks/${id}/move`, { method: 'PATCH', body: JSON.stringify(data) });
  deleteTask = (id: string) => this.request<any>(`/tasks/${id}`, { method: 'DELETE' });
  bulkUpdateTasks = (data: any) => this.request<any>('/tasks/bulk', { method: 'POST', body: JSON.stringify(data) });

  // Subtasks
  addSubtask = (taskId: string, title: string) =>
    this.request<any>(`/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) });
  toggleSubtask = (subtaskId: string) =>
    this.request<any>(`/tasks/subtasks/${subtaskId}/toggle`, { method: 'PATCH' });
  deleteSubtask = (subtaskId: string) =>
    this.request<any>(`/tasks/subtasks/${subtaskId}`, { method: 'DELETE' });

  // Dependencies
  addDependency = (taskId: string, dependsOnTaskId: string) =>
    this.request<any>(`/tasks/${taskId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ dependsOnTaskId }),
    });
  removeDependency = (taskId: string, dependsOnTaskId: string) =>
    this.request<any>(`/tasks/${taskId}/dependencies/${dependsOnTaskId}`, { method: 'DELETE' });

  // Comments (In-task chat)
  addComment = (taskId: string, content: string, imageUrl?: string) =>
    this.request<any>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, imageUrl }),
    });
  deleteComment = (commentId: string) =>
    this.request<any>(`/tasks/comments/${commentId}`, { method: 'DELETE' });

  // Attachments & Standalone Media Upload (Images & Files)
  uploadMedia = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{
      fileUrl: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      isImage: boolean;
    }>('/tasks/media', { method: 'POST', body: formData });
  };
  uploadAttachment = (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<any>(`/tasks/${taskId}/attachments`, { method: 'POST', body: formData });
  };
  deleteAttachment = (attachmentId: string) =>
    this.request<any>(`/tasks/attachments/${attachmentId}`, { method: 'DELETE' });

  // Notifications
  getNotifications = () => this.request<any>('/notifications');
  markNotificationRead = (id: string) => this.request<any>(`/notifications/${id}/read`, { method: 'PATCH' });
  markAllNotificationsRead = () => this.request<any>('/notifications/read-all', { method: 'PATCH' });
  clearNotifications = () => this.request<any>('/notifications/clear', { method: 'DELETE' });

  // Analytics
  getDashboardSummary = (workspaceId?: string) =>
    this.request<any>(`/analytics/dashboard${workspaceId ? `?workspaceId=${workspaceId}` : ''}`);
  getProjectBurndown = (projectId: string) =>
    this.request<any>(`/analytics/projects/${projectId}/burndown`);
}

export const api = new ApiClient();
export default api;
