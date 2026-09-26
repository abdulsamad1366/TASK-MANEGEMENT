'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { getSocket, joinProjectRoom, leaveProjectRoom } from '../lib/socket';
import {
  Space,
  Project,
  TaskList,
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
import { SpaceCreateModal } from '../components/SpaceCreateModal';
import { ProjectCreateModal } from '../components/ProjectCreateModal';
import { ListCreateModal } from '../components/ListCreateModal';
import { InviteMemberModal } from '../components/InviteMemberModal';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { AuthModal } from '../components/AuthModal';
import { Sparkles, Plus, Layers, Folder, ListTodo } from 'lucide-react';

export default function Home() {
  const { user, activeWorkspace, isLoading: isAuthLoading } = useAuth();

  // Navigation & View state
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'project' | 'settings'>('project');
  const [currentView, setCurrentView] = useState<BoardView>('kanban');

  // ClickUp Hierarchy State: Spaces > Projects > Lists
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Active Context Objects
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentList, setCurrentList] = useState<TaskList | null>(null);

  // Active Board Data
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);

  // Modals state
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState<string | undefined>(undefined);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectCreateSpaceId, setProjectCreateSpaceId] = useState<string | undefined>(undefined);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [listCreateProjectId, setListCreateProjectId] = useState<string | undefined>(undefined);
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

  // 1. Load ClickUp Hierarchy when workspace changes
  useEffect(() => {
    if (!activeWorkspace?.id) return;
    loadHierarchy();
  }, [activeWorkspace?.id]);

  const loadHierarchy = async () => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await api.getHierarchy(activeWorkspace.id);
      const loadedSpaces: Space[] = res.spaces || [];
      setSpaces(loadedSpaces);

      // Auto-select first space, project, list if not currently selected
      if (loadedSpaces.length > 0) {
        const firstSpace = loadedSpaces[0];
        setSelectedSpaceId((prev) => prev || firstSpace.id);
        setCurrentSpace(firstSpace);

        if (firstSpace.projects && firstSpace.projects.length > 0) {
          const firstProj = firstSpace.projects[0];
          setSelectedProjectId((prev) => prev || firstProj.id);
          setCurrentProject(firstProj);

          if (firstProj.lists && firstProj.lists.length > 0) {
            const firstList = firstProj.lists[0];
            setSelectedListId((prev) => prev || firstList.id);
            loadListDetails(firstList.id);
          } else {
            // Project has no lists, load project details
            loadProjectDetails(firstProj.id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load ClickUp hierarchy:', err);
    }
  };

  // 2. Load List details (Columns with custom statuses + Tasks)
  const loadListDetails = async (listId: string) => {
    try {
      const res = await api.getTaskList(listId);
      const listData: TaskList = res.list;
      setCurrentList(listData);
      setSelectedListId(listId);

      if (listData.project) {
        setCurrentProject(listData.project);
        setSelectedProjectId(listData.project.id);
        if (listData.project.space) {
          setCurrentSpace(listData.project.space);
          setSelectedSpaceId(listData.project.space.id);
        }
      }

      setColumns(listData.columns || []);

      // Flatten tasks from columns
      const allListTasks: Task[] = [];
      listData.columns?.forEach((col) => {
        if (col.tasks) {
          allListTasks.push(...col.tasks);
        }
      });
      setTasks(allListTasks);

      // Set workspace members
      const members =
        (listData.project?.space as any)?.workspace?.members ||
        activeWorkspace?.members ||
        [];
      if (members.length > 0) {
        setWorkspaceMembers(members);
      }
    } catch (err) {
      console.error('Failed to load list details:', err);
    }
  };

  // Fallback: Load Project details
  const loadProjectDetails = async (projectId: string) => {
    try {
      const res = await api.getProject(projectId);
      setCurrentProject(res.project);
      setSelectedProjectId(projectId);

      if (res.project.lists && res.project.lists.length > 0) {
        loadListDetails(res.project.lists[0].id);
        return;
      }

      setColumns(res.project.columns || []);
      const allProjectTasks: Task[] = [];
      res.project.columns?.forEach((col: BoardColumn) => {
        if (col.tasks) allProjectTasks.push(...col.tasks);
      });
      setTasks(allProjectTasks);

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

      socket.on('task:created', handleTaskCreated);
      socket.on('task:updated', handleTaskUpdated);
      socket.on('task:moved', handleTaskMoved);
      socket.on('task:deleted', handleTaskDeleted);

      return () => {
        leaveProjectRoom(selectedProjectId);
        socket.off('task:created', handleTaskCreated);
        socket.off('task:updated', handleTaskUpdated);
        socket.off('task:moved', handleTaskMoved);
        socket.off('task:deleted', handleTaskDeleted);
      };
    }
  }, [selectedProjectId]);

  // Handle Task Move (Kanban drag-and-drop)
  const handleTaskMove = async (taskId: string, destColumnId: string, newOrder: number) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, columnId: destColumnId, order: newOrder } : t
      )
    );

    try {
      await api.moveTask(taskId, { columnId: destColumnId, order: newOrder });
    } catch (err) {
      console.error('Failed to move task on server:', err);
      // Revert if error
      if (selectedListId) loadListDetails(selectedListId);
    }
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

  // Auth Loading
  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7B68EE] border-t-transparent" />
          <span className="text-xs text-slate-500 font-medium">Loading Flowdesk Workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  // All projects across spaces for global search
  const allProjects = spaces.flatMap((s) => s.projects || []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setCurrentTab('settings')}
        onSelectTask={(tId) => setActiveTaskId(tId)}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* ClickUp Sidebar (Spaces > Projects > Lists) */}
        <Sidebar
          currentTab={currentTab}
          spaces={spaces}
          selectedSpaceId={selectedSpaceId}
          selectedProjectId={selectedProjectId}
          selectedListId={selectedListId}
          activeWorkspace={activeWorkspace}
          onSelectTab={(tab) => setCurrentTab(tab)}
          onSelectSpace={(spaceId) => {
            setSelectedSpaceId(spaceId);
            const sp = spaces.find((s) => s.id === spaceId);
            if (sp) setCurrentSpace(sp);
          }}
          onSelectProject={(projectId) => {
            setSelectedProjectId(projectId);
            loadProjectDetails(projectId);
          }}
          onSelectList={(listId) => {
            loadListDetails(listId);
          }}
          onNewSpace={() => setIsCreateSpaceOpen(true)}
          onNewProject={(spaceId) => {
            setProjectCreateSpaceId(spaceId || selectedSpaceId || undefined);
            setIsCreateProjectOpen(true);
          }}
          onNewList={(projectId) => {
            setListCreateProjectId(projectId);
            setIsCreateListOpen(true);
          }}
          onInviteMember={() => setIsInviteOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-6 py-5 max-h-[calc(100vh-64px)]">
          {currentTab === 'dashboard' ? (
            <DashboardView
              workspaceId={activeWorkspace?.id || ''}
              projects={allProjects}
              onSelectTask={(t) => setActiveTaskId(t.id)}
            />
          ) : currentTab === 'settings' && activeWorkspace ? (
            <SettingsView
              workspace={activeWorkspace}
              members={workspaceMembers}
              onWorkspaceUpdated={() => loadHierarchy()}
              onRefreshMembers={() => {
                if (selectedListId) loadListDetails(selectedListId);
              }}
            />
          ) : (
            /* Board View */
            <div>
              {/* ClickUp Breadcrumbs & Header Bar */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-2 text-xs">
                  {currentSpace && (
                    <span className="flex items-center gap-1.5 font-bold text-slate-700">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: currentSpace.color || '#7B68EE' }}
                      />
                      {currentSpace.name}
                    </span>
                  )}

                  {currentProject && (
                    <>
                      <span className="text-slate-300">/</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Folder className="w-3.5 h-3.5 text-slate-400" />
                        {currentProject.name}
                      </span>
                    </>
                  )}

                  {currentList && (
                    <>
                      <span className="text-slate-300">/</span>
                      <span className="font-bold text-[#7B68EE] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60 flex items-center gap-1">
                        <ListTodo className="w-3.5 h-3.5 text-[#7B68EE]" />
                        {currentList.name}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTargetColumnId(undefined);
                      setIsCreateTaskOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#7B68EE] hover:bg-[#6C5CE7] text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Task
                  </button>
                </div>
              </div>

              {/* View Switcher & Filters */}
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

      {/* MODALS */}
      {/* 1. Task Detail / Edit Modal with In-Task Chat & Images */}
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

      {/* 2. Create Task Modal with In-Task Chat while creating */}
      {isCreateTaskOpen && selectedProjectId && (
        <TaskCreateModal
          projectId={selectedProjectId}
          listId={selectedListId || undefined}
          lists={currentProject?.lists || []}
          defaultColumnId={targetColumnId}
          columns={columns}
          workspaceMembers={workspaceMembers}
          onClose={() => setIsCreateTaskOpen(false)}
          onTaskCreated={(newTask) => {
            setTasks((prev) => [...prev, newTask]);
            loadHierarchy();
          }}
        />
      )}

      {/* 3. Create Space Modal */}
      {isCreateSpaceOpen && activeWorkspace && (
        <SpaceCreateModal
          workspaceId={activeWorkspace.id}
          onClose={() => setIsCreateSpaceOpen(false)}
          onSpaceCreated={(newSpace) => {
            setSpaces((prev) => [...prev, newSpace]);
            setSelectedSpaceId(newSpace.id);
            setCurrentSpace(newSpace);
          }}
        />
      )}

      {/* 4. Create Project Modal */}
      {isCreateProjectOpen && activeWorkspace && (
        <ProjectCreateModal
          workspaceId={activeWorkspace.id}
          spaces={spaces}
          initialSpaceId={projectCreateSpaceId}
          onClose={() => setIsCreateProjectOpen(false)}
          onProjectCreated={(newProject) => {
            loadHierarchy();
            setSelectedProjectId(newProject.id);
            loadProjectDetails(newProject.id);
          }}
        />
      )}

      {/* 5. Create List Modal */}
      {isCreateListOpen && listCreateProjectId && (
        <ListCreateModal
          projectId={listCreateProjectId}
          projectName={allProjects.find((p) => p.id === listCreateProjectId)?.name}
          onClose={() => setIsCreateListOpen(false)}
          onListCreated={(newList) => {
            loadHierarchy();
            loadListDetails(newList.id);
          }}
        />
      )}

      {/* 6. Invite Member Modal */}
      {isInviteOpen && activeWorkspace && (
        <InviteMemberModal
          workspaceId={activeWorkspace.id}
          onClose={() => setIsInviteOpen(false)}
          onMemberInvited={() => {
            if (selectedListId) loadListDetails(selectedListId);
          }}
        />
      )}

      {/* 7. Spotlight Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        tasks={tasks}
        projects={allProjects}
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
