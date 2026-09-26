'use client';

import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Task, BoardColumn, WorkspaceMember, Priority } from '../types';
import { getPriorityBadge, parseLabels, cn } from '../lib/utils';
import {
  X,
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Trash2,
  Clock,
  Send,
  Plus,
  AlertCircle,
  Tag,
  Link2,
} from 'lucide-react';
import { format } from 'date-fns';

interface TaskModalProps {
  taskId: string | null;
  columns: BoardColumn[];
  workspaceMembers: WorkspaceMember[];
  allTasks?: Task[];
  onClose: () => void;
  onTaskUpdated: (updatedTask: Task) => void;
  onTaskDeleted: (taskId: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  taskId,
  columns,
  workspaceMembers,
  allTasks = [],
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}) => {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [columnId, setColumnId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = useState('');

  // Subtask & Comment states
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [selectedBlockerId, setSelectedBlockerId] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    loadTaskDetails();
  }, [taskId]);

  const loadTaskDetails = async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      const res = await api.getTask(taskId);
      const t: Task = res.task;
      setTask(t);
      setTitle(t.title);
      setDescription(t.description || '');
      setPriority(t.priority);
      setColumnId(t.columnId);
      setStartDate(t.startDate ? t.startDate.split('T')[0] : '');
      setDueDate(t.dueDate ? t.dueDate.split('T')[0] : '');
      setLabels(parseLabels(t.labels));
    } catch (err) {
      console.error('Failed to load task details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveField = async (fieldsToUpdate: Partial<any>) => {
    if (!taskId || !task) return;
    try {
      const res = await api.updateTask(taskId, fieldsToUpdate);
      setTask(res.task);
      onTaskUpdated(res.task);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !newSubtaskTitle.trim()) return;
    try {
      const res = await api.addSubtask(taskId, newSubtaskTitle.trim());
      setTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: [...(prev.subtasks || []), res.subtask],
            }
          : null
      );
      setNewSubtaskTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    try {
      const res = await api.toggleSubtask(subtaskId);
      setTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: prev.subtasks?.map((s) =>
                s.id === subtaskId ? res.subtask : s
              ),
            }
          : null
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await api.deleteSubtask(subtaskId);
      setTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: prev.subtasks?.filter((s) => s.id !== subtaskId),
            }
          : null
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !newComment.trim()) return;
    try {
      const res = await api.addComment(taskId, newComment.trim());
      setTask((prev) =>
        prev
          ? {
              ...prev,
              comments: [...(prev.comments || []), res.comment],
            }
          : null
      );
      setNewComment('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!taskId || !file) return;

    setIsUploading(true);
    try {
      const res = await api.uploadAttachment(taskId, file);
      setTask((prev) =>
        prev
          ? {
              ...prev,
              attachments: [res.attachment, ...(prev.attachments || [])],
            }
          : null
      );
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleAssignee = async (userId: string) => {
    if (!task) return;
    const currentAssigneeIds = task.assignees?.map((a) => a.userId) || [];
    const newAssigneeIds = currentAssigneeIds.includes(userId)
      ? currentAssigneeIds.filter((id) => id !== userId)
      : [...currentAssigneeIds, userId];

    await handleSaveField({ assigneeIds: newAssigneeIds });
  };

  const handleAddLabel = () => {
    if (!newLabelInput.trim()) return;
    const nextLabels = [...labels, newLabelInput.trim()];
    setLabels(nextLabels);
    setNewLabelInput('');
    handleSaveField({ labels: nextLabels });
  };

  const handleRemoveLabel = (lbl: string) => {
    const nextLabels = labels.filter((l) => l !== lbl);
    setLabels(nextLabels);
    handleSaveField({ labels: nextLabels });
  };

  const handleAddDependency = async () => {
    if (!taskId || !selectedBlockerId) return;
    try {
      const res = await api.addDependency(taskId, selectedBlockerId);
      setTask((prev) =>
        prev
          ? {
              ...prev,
              blockedBy: [...(prev.blockedBy || []), res.dependency],
            }
          : null
      );
      setSelectedBlockerId('');
    } catch (err) {
      console.error('Failed to add dependency:', err);
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    if (confirm('Are you sure you want to delete this task?')) {
      await api.deleteTask(taskId);
      onTaskDeleted(taskId);
      onClose();
    }
  };

  if (!taskId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
              {task?.project?.key ? `${task.project.key}-${task.taskNumber}` : 'TASK'}
            </span>

            {/* Column / Status selector */}
            <select
              value={columnId}
              onChange={(e) => {
                setColumnId(e.target.value);
                if (taskId) {
                  api.moveTask(taskId, { columnId: e.target.value, order: 1000 }).then((res) => {
                    setTask(res.task);
                    onTaskUpdated(res.task);
                  });
                }
              }}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-indigo-500"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Priority selector */}
            <select
              value={priority}
              onChange={(e) => {
                const nextP = e.target.value as Priority;
                setPriority(nextP);
                handleSaveField({ priority: nextP });
              }}
              className={cn(
                'text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer',
                getPriorityBadge(priority).bg,
                getPriorityBadge(priority).text,
                getPriorityBadge(priority).border
              )}
            >
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent Priority</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              title="Delete Task"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
            {/* Left 2 Cols: Main Content */}
            <div className="lg:col-span-2 p-6 space-y-6">
              {/* Task Title Inline Edit */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => handleSaveField({ title })}
                  className="w-full text-xl font-bold text-slate-900 dark:text-slate-100 bg-transparent border-0 border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-indigo-500 focus:ring-0 px-0 py-1 transition"
                  placeholder="Task Title..."
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => handleSaveField({ description })}
                  placeholder="Add details, acceptance criteria, or markdown notes..."
                  className="w-full text-sm text-slate-700 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none"
                />
              </div>

              {/* Subtasks Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Checklist / Subtasks
                    </span>
                  </div>
                  {task?.subtasks && task.subtasks.length > 0 && (
                    <span className="text-xs font-medium text-slate-500">
                      {task.subtasks.filter((s) => s.isCompleted).length} / {task.subtasks.length}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {task?.subtasks && task.subtasks.length > 0 && (
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-3">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-300"
                      style={{
                        width: `${
                          (task.subtasks.filter((s) => s.isCompleted).length /
                            task.subtasks.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                )}

                {/* Subtask items */}
                <div className="space-y-1.5 mb-3">
                  {task?.subtasks?.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between group px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={sub.isCompleted}
                          onChange={() => handleToggleSubtask(sub.id)}
                          className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <span
                          className={cn(
                            'text-sm transition-all',
                            sub.isCompleted
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-200'
                          )}
                        >
                          {sub.title}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteSubtask(sub.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Subtask Form */}
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add checklist item..."
                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* Task Dependencies */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Task Dependencies (Blocked by)
                  </span>
                </div>

                {task?.blockedBy && task.blockedBy.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {task.blockedBy.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400"
                      >
                        <span className="font-medium">
                          Blocked by: {dep.task?.title || dep.dependsOnTaskId}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <select
                    value={selectedBlockerId}
                    onChange={(e) => setSelectedBlockerId(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none"
                  >
                    <option value="">Select blocking task...</option>
                    {allTasks
                      .filter((t) => t.id !== taskId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.project?.key ? `${t.project.key}-${t.taskNumber}` : '#'}: {t.title}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddDependency}
                    disabled={!selectedBlockerId}
                    className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-50 rounded-lg text-xs font-medium transition"
                  >
                    Link
                  </button>
                </div>
              </div>

              {/* Tabs: Comments & Activity Log */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={cn(
                      'text-xs font-semibold pb-1 flex items-center gap-1.5 transition',
                      activeTab === 'details'
                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Comments ({task?.comments?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={cn(
                      'text-xs font-semibold pb-1 flex items-center gap-1.5 transition',
                      activeTab === 'activity'
                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    )}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Activity History
                  </button>
                </div>

                {activeTab === 'details' ? (
                  <div className="space-y-4">
                    {/* Comments list */}
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {task?.comments?.map((comment) => (
                        <div key={comment.id} className="flex gap-3 text-xs">
                          <img
                            src={
                              comment.user?.avatarUrl ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                comment.user?.name || 'U'
                              )}`
                            }
                            alt=""
                            className="w-7 h-7 rounded-full object-cover mt-0.5"
                          />
                          <div className="flex-1 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {comment.user?.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      ))}

                      {(!task?.comments || task.comments.length === 0) && (
                        <p className="text-xs text-slate-400 italic">
                          No comments yet. Mention teammates with @name to notify them.
                        </p>
                      )}
                    </div>

                    {/* New comment input */}
                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment... (Type @ to mention teammates)"
                        className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Activity Timeline */
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {task?.activityLogs?.map((log) => (
                      <div key={log.id} className="flex items-start gap-2.5 text-xs text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                        <div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {log.user?.name || 'User'}
                          </span>{' '}
                          performed{' '}
                          <span className="font-semibold text-indigo-500">{log.action}</span>
                          <span className="text-[10px] text-slate-400 ml-2">
                            {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 Col: Metadata & Sidebar Controls */}
            <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/40">
              {/* Assignees */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Assignees
                </label>
                <div className="space-y-1.5">
                  {workspaceMembers.map((m) => {
                    const isAssigned = task?.assignees?.some((a) => a.userId === m.userId);
                    return (
                      <div
                        key={m.userId}
                        onClick={() => handleToggleAssignee(m.userId)}
                        className={cn(
                          'flex items-center gap-2.5 p-1.5 rounded-lg cursor-pointer transition text-xs',
                          isAssigned
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        <img
                          src={
                            m.user.avatarUrl ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                              m.user.name
                            )}`
                          }
                          alt=""
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="flex-1 truncate">{m.user.name}</span>
                        {isAssigned && <span className="text-indigo-600 font-bold">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Due Date & Start Date */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      handleSaveField({ startDate: e.target.value });
                    }}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      handleSaveField({ dueDate: e.target.value });
                    }}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Labels / Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Labels & Tags
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {labels.map((lbl) => (
                    <span
                      key={lbl}
                      className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                    >
                      {lbl}
                      <button
                        onClick={() => handleRemoveLabel(lbl)}
                        className="hover:text-rose-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newLabelInput}
                    onChange={(e) => setNewLabelInput(e.target.value)}
                    placeholder="New tag..."
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                  />
                  <button
                    onClick={handleAddLabel}
                    className="p-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 rounded-lg text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* File Attachments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Attachments
                  </label>
                  <label className="cursor-pointer text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>

                {isUploading && (
                  <p className="text-xs text-indigo-500 animate-pulse">Uploading file...</p>
                )}

                <div className="space-y-1.5">
                  {task?.attachments?.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-medium text-indigo-600 dark:text-indigo-400 hover:underline max-w-35"
                      >
                        {att.fileName}
                      </a>
                      <span className="text-[10px] text-slate-400">
                        {Math.round(att.fileSize / 1024)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
