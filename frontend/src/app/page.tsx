'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { getSocket, joinProjectRoom, leaveProjectRoom } from '../lib/socket';
import {
  Project,
  Task,
  BoardColumn,
  BoardView,
  FilterState,
  WorkspaceMember,
} from '../types';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { FilterBar } from '../components/FilterBar';
import { KanbanBoard } from '../components/KanbanBoard';
import { ListView } from '../components/ListView';
import { CalendarView } from '../components/CalendarView';
import { TimelineView } from '../components/TimelineView';
import { DashboardView } from '../components/DashboardView';
import { SettingsView } from '../components/SettingsView';
import { TaskModal } from '../components/TaskModal';
import { TaskCreateModal } from '../components/TaskCreateModal';
import { ProjectCreateModal } from '../components/ProjectCreateModal';
import { InviteMemberModal } from '../components/InviteMemberModal';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { AuthModal } from '../components/AuthModal';

export default function Home() {
  const { user, activeWorkspace, isLoading: isAuthLoading } = useAuth();

  // Navigation & View state
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'project' | 'settings'>('project');
  const [currentView, setCurrentView] = useState<BoardView>('kanban');

  // Core Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);

  // Modals state
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState<string | undefined>(undefined);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Filtering state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    assigneeId: '',
    priority: '',
    status: '',
    label: '',
    quickView: 'all',
  });

  // 1. Load Projects when workspace changes
  useEffect(() => {
    if (!activeWorkspace?.id) return;
    loadProjects();
  }, [activeWorkspace?.id]);

  const loadProjects = async () => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await api.getProjects(activeWorkspace.id);
      setProjects(res.projects || []);

      if (res.projects?.length > 0) {
        // Select first project by default if none selected
        const pId = res.projects[0].id;
        setSelectedProjectId(pId);
        loadProjectDetails(pId);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  // 2. Load Project details (columns + tasks)
  const loadProjectDetails = async (projectId: string) => {
    try {
      const res = await api.getProject(projectId);
      setCurrentProject(res.project);
      setColumns(res.project.columns || []);

      // Flatten all tasks from columns
      const allProjectTasks: Task[] = [];
      res.project.columns?.forEach((col: BoardColumn) => {
        if (col.tasks) {
          allProjectTasks.push(...col.tasks);
        }
      });
      setTasks(allProjectTasks);

      // Load workspace members
      if (res.project.workspace?.members) {
        setWorkspaceMembers(res.project.workspace.members);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    }
  };

  // 3. Socket.io Real-time Event Subscription
  useEffect(() => {
    if (!selectedProjectId) return;

    joinProjectRoom(selectedProjectId);
    const socket = getSocket();

    if (socket) {
      const handleTaskCreated = (newTask: Task) => {
        setTasks((prev) => {
          if (prev.some((t) => t.id === newTask.id)) return prev;
          return [...prev, newTask];
        });
      };

      const handleTaskUpdated = (updatedTask: Task) => {
        setTasks((prev) =>
          prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
        );
      };

      const handleTaskMoved = ({
        taskId,
        destColumnId,
        newOrder,
      }: {
        taskId: string;
        destColumnId: string;
        newOrder: number;
      }) => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, columnId: destColumnId, order: newOrder } : t
          )
        );
      };

      const handleTaskDeleted = ({ taskId }: { taskId: string }) => {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      };

      const handleColumnCreated = (column: BoardColumn) => {
        setColumns((prev) => [...prev, column]);
      };

      socket.on('task:created', handleTaskCreated);
      socket.on('task:updated', handleTaskUpdated);
      socket.on('task:moved', handleTaskMoved);
      socket.on('task:deleted', handleTaskDeleted);
      socket.on('column:created', handleColumnCreated);

      return () => {
        leaveProjectRoom(selectedProjectId);
        socket.off('task:created', handleTaskCreated);
        socket.off('task:updated', handleTaskUpdated);
        socket.off('task:moved', handleTaskMoved);
        socket.off('task:deleted', handleTaskDeleted);
        socket.off('column:created', handleColumnCreated);
      };
    }
  }, [selectedProjectId]);

  // Handle Task Move (Kanban drag-and-drop)
  const handleTaskMove = async (taskId: string, destColumnId: string, newOrder: number) => {
    await api.moveTask(taskId, { columnId: destColumnId, order: newOrder });
  };

  // Filtered tasks computation
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        const matchesKey = `${t.project?.key}-${t.taskNumber}`.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesKey) return false;
      }

      // Assignee
      if (filters.assigneeId) {
        const hasAssignee = t.assignees?.some((a) => a.userId === filters.assigneeId);
        if (!hasAssignee) return false;
      }

      // Priority
      if (filters.priority && t.priority !== filters.priority) {
        return false;
      }

      // Quick views
      const now = new Date();
      if (filters.quickView === 'my_tasks') {
        const isMine = t.assignees?.some((a) => a.userId === user?.id);
        if (!isMine) return false;
      } else if (filters.quickView === 'overdue') {
        if (!t.dueDate || new Date(t.dueDate) >= now || t.column?.isCompleted) return false;
      } else if (filters.quickView === 'due_today') {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        const isToday =
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear();
        if (!isToday) return false;
      } else if (filters.quickView === 'due_this_week') {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (d < now || d > endOfWeek) return false;
      }

      return true;
    });
  }, [tasks, filters, user?.id]);

  // Bulk actions
  const handleBulkUpdate = async (updates: { columnId?: string; priority?: any }) => {
    if (selectedTaskIds.length === 0) return;
    try {
      await api.bulkUpdateTasks({
        taskIds: selectedTaskIds,
        columnId: updates.columnId,
        priority: updates.priority,
      });

      // Update local state
      setTasks((prev) =>
        prev.map((t) => {
          if (selectedTaskIds.includes(t.id)) {
            return {
              ...t,
              ...(updates.columnId ? { columnId: updates.columnId } : {}),
              ...(updates.priority ? { priority: updates.priority } : {}),
            };
          }
          return t;
        })
      );
      setSelectedTaskIds([]);
    } catch (err) {
      console.error('Bulk update failed:', err);
    }
  };

  const handleSelectTaskCheckbox = (taskId: string, selected: boolean) => {
    setSelectedTaskIds((prev) =>
      selected ? [...prev, taskId] : prev.filter((id) => id !== taskId)
    );
  };

  // Show Auth Modal if not authenticated
  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
          <span className="text-xs text-slate-400 font-medium">Loading SyncPlan Workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setCurrentTab('settings')}
        onSelectTask={(tId) => setActiveTaskId(tId)}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          selectedProjectId={selectedProjectId}
          projects={projects}
          activeWorkspace={activeWorkspace}
          onSelectTab={(tab) => setCurrentTab(tab)}
          onSelectProject={(pId) => {
            setSelectedProjectId(pId);
            loadProjectDetails(pId);
          }}
          onNewProject={() => setIsCreateProjectOpen(true)}
          onInviteMember={() => setIsInviteOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6 max-h-[calc(100vh-64px)]">
          {currentTab === 'dashboard' ? (
            <DashboardView
              workspaceId={activeWorkspace?.id || ''}
              projects={projects}
              onSelectTask={(t) => setActiveTaskId(t.id)}
            />
          ) : currentTab === 'settings' && activeWorkspace ? (
            <SettingsView
              workspace={activeWorkspace}
              members={workspaceMembers}
              onWorkspaceUpdated={(updated) => loadProjects()}
              onRefreshMembers={() => {
                if (selectedProjectId) loadProjectDetails(selectedProjectId);
              }}
            />
          ) : (
            /* Project Board Area */
            <div>
              {/* Project Header */}
              {currentProject && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: currentProject.color }}
                    />
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {currentProject.name}
                    </h1>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                      {currentProject.key}
                    </span>
                  </div>
                </div>
              )}

              {/* Filter & View Toolbar */}
              <FilterBar
                currentView={currentView}
                onViewChange={setCurrentView}
                filters={filters}
                onFilterChange={setFilters}
                workspaceMembers={workspaceMembers}
                columns={columns}
                onNewTask={() => {
                  setTargetColumnId(undefined);
                  setIsCreateTaskOpen(true);
                }}
                selectedTaskCount={selectedTaskIds.length}
                onBulkUpdate={handleBulkUpdate}
                onClearSelection={() => setSelectedTaskIds([])}
              />

              {/* Render Active View */}
              {currentView === 'kanban' && (
                <KanbanBoard
                  columns={columns}
                  tasks={filteredTasks}
                  onTaskMove={handleTaskMove}
                  onTaskClick={(t) => setActiveTaskId(t.id)}
                  onAddTask={(colId) => {
                    setTargetColumnId(colId);
                    setIsCreateTaskOpen(true);
                  }}
                  selectedTaskIds={selectedTaskIds}
                  onSelectTask={handleSelectTaskCheckbox}
                />
              )}

              {currentView === 'list' && (
                <ListView
                  columns={columns}
                  tasks={filteredTasks}
                  onTaskClick={(t) => setActiveTaskId(t.id)}
                  selectedTaskIds={selectedTaskIds}
                  onSelectTask={handleSelectTaskCheckbox}
                />
              )}

              {currentView === 'calendar' && (
                <CalendarView
                  tasks={filteredTasks}
                  onTaskClick={(t) => setActiveTaskId(t.id)}
                />
              )}

              {currentView === 'timeline' && (
                <TimelineView
                  tasks={filteredTasks}
                  onTaskClick={(t) => setActiveTaskId(t.id)}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {/* 1. Task Detail / Edit Modal */}
      {activeTaskId && (
        <TaskModal
          taskId={activeTaskId}
          columns={columns}
          workspaceMembers={workspaceMembers}
          allTasks={tasks}
          onClose={() => setActiveTaskId(null)}
          onTaskUpdated={(updated) => {
            setTasks((prev) =>
              prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
            );
          }}
          onTaskDeleted={(tId) => {
            setTasks((prev) => prev.filter((t) => t.id !== tId));
          }}
        />
      )}

      {/* 2. Create Task Modal */}
      {isCreateTaskOpen && selectedProjectId && (
        <TaskCreateModal
          projectId={selectedProjectId}
          defaultColumnId={targetColumnId}
          columns={columns}
          workspaceMembers={workspaceMembers}
          onClose={() => setIsCreateTaskOpen(false)}
          onTaskCreated={(newTask) => {
            setTasks((prev) => [...prev, newTask]);
          }}
        />
      )}

      {/* 3. Create Project Modal */}
      {isCreateProjectOpen && activeWorkspace && (
        <ProjectCreateModal
          workspaceId={activeWorkspace.id}
          onClose={() => setIsCreateProjectOpen(false)}
          onProjectCreated={(newProject) => {
            setProjects((prev) => [newProject, ...prev]);
            setSelectedProjectId(newProject.id);
            loadProjectDetails(newProject.id);
          }}
        />
      )}

      {/* 4. Invite Member Modal */}
      {isInviteOpen && activeWorkspace && (
        <InviteMemberModal
          workspaceId={activeWorkspace.id}
          onClose={() => setIsInviteOpen(false)}
          onMemberInvited={() => {
            if (selectedProjectId) loadProjectDetails(selectedProjectId);
          }}
        />
      )}

      {/* 5. Spotlight Search Modal (Cmd+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        tasks={tasks}
        projects={projects}
        onSelectTask={(t) => setActiveTaskId(t.id)}
        onSelectProject={(pId) => {
          setSelectedProjectId(pId);
          loadProjectDetails(pId);
          setCurrentTab('project');
        }}
      />
    </div>
  );
}
