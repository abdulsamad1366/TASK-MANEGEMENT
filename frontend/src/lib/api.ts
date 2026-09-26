const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

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
      }
    }

    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_URL}${endpoint}`;
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
          const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
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
  login = (credentials: { email: string; password: string }) =>
    this.request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });

  register = (userData: { email: string; password: string; name: string; role?: string }) =>
    this.request<any>('/auth/register', { method: 'POST', body: JSON.stringify(userData) });

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
  updateWorkspace = (id: string, data: any) =>
    this.request<any>(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  inviteMember = (workspaceId: string, data: { email: string; role: string }) =>
    this.request<any>(`/workspaces/${workspaceId}/invite`, { method: 'POST', body: JSON.stringify(data) });
  updateMemberRole = (workspaceId: string, memberId: string, role: string) =>
    this.request<any>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  removeMember = (workspaceId: string, memberId: string) =>
    this.request<any>(`/workspaces/${workspaceId}/members/${memberId}`, { method: 'DELETE' });

  // Project endpoints
  getProjects = (workspaceId: string) => this.request<any>(`/projects?workspaceId=${workspaceId}`);
  getProject = (id: string) => this.request<any>(`/projects/${id}`);
  createProject = (data: any) => this.request<any>('/projects', { method: 'POST', body: JSON.stringify(data) });
  updateProject = (id: string, data: any) =>
    this.request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  deleteProject = (id: string) => this.request<any>(`/projects/${id}`, { method: 'DELETE' });

  // Column endpoints
  createColumn = (projectId: string, data: any) =>
    this.request<any>(`/projects/${projectId}/columns`, { method: 'POST', body: JSON.stringify(data) });
  updateColumn = (columnId: string, data: any) =>
    this.request<any>(`/projects/columns/${columnId}`, { method: 'PATCH', body: JSON.stringify(data) });
  reorderColumns = (projectId: string, columnIds: string[]) =>
    this.request<any>(`/projects/${projectId}/columns/reorder`, {
      method: 'POST',
      body: JSON.stringify({ columnIds }),
    });
  deleteColumn = (columnId: string) =>
    this.request<any>(`/projects/columns/${columnId}`, { method: 'DELETE' });

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

  // Comments
  addComment = (taskId: string, content: string) =>
    this.request<any>(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) });
  deleteComment = (commentId: string) =>
    this.request<any>(`/tasks/comments/${commentId}`, { method: 'DELETE' });

  // Attachments
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
