'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { Task, BoardColumn, WorkspaceMember, Priority, Comment, Attachment } from '../types';
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
  Tag,
  Users,
  ImageIcon,
  History,
  Check,
  Download,
  Maximize2,
  Sparkles,
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
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'activity'>('chat');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [columnId, setColumnId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [timeEstimate, setTimeEstimate] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = useState('');

  // Subtask & Dependencies
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [selectedBlockerId, setSelectedBlockerId] = useState('');

  // In-Task Chat State
  const [chatComment, setChatComment] = useState('');
  const [chatImageUrl, setChatImageUrl] = useState<string | null>(null);
  const [isUploadingChatImg, setIsUploadingChatImg] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatImgInputRef = useRef<HTMLInputElement>(null);

  // Attachments
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Lightbox preview for images
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Assignees Dropdown state
  const [isAssigneePickerOpen, setIsAssigneePickerOpen] = useState(false);

  // Priority helper styling
  const priorityConfig: Record<Priority, { label: string; bg: string; text: string; border: string }> = {
    URGENT: { label: 'Urgent', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    HIGH: { label: 'High', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    MEDIUM: { label: 'Normal', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
    LOW: { label: 'Low', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  };

  useEffect(() => {
    if (!taskId) return;
    loadTaskDetails();

    // Socket.io Real-time subscription to this task
    const socket = getSocket();
    if (socket) {
      socket.emit('task:join', { taskId });

      const handleChatMessage = (data: { taskId: string; comment: Comment }) => {
        if (data.taskId === taskId) {
          setTask((prev) => {
            if (!prev) return null;
            if (prev.comments?.some((c) => c.id === data.comment.id)) return prev;
            return {
              ...prev,
              comments: [...(prev.comments || []), data.comment],
            };
          });
          scrollToBottom();
        }
      };

      const handleAttachmentCreated = (data: { taskId: string; attachment: Attachment }) => {
        if (data.taskId === taskId) {
          setTask((prev) => {
            if (!prev) return null;
            if (prev.attachments?.some((a) => a.id === data.attachment.id)) return prev;
            return {
              ...prev,
              attachments: [data.attachment, ...(prev.attachments || [])],
            };
          });
        }
      };

      socket.on('chat:message', handleChatMessage);
      socket.on('attachment:created', handleAttachmentCreated);

      return () => {
        socket.emit('task:leave', { taskId });
        socket.off('chat:message', handleChatMessage);
        socket.off('attachment:created', handleAttachmentCreated);
      };
    }
  }, [taskId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

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
      setTimeEstimate(t.timeEstimate || '');
      setCoverImage(t.coverImage || null);
      setLabels(parseLabels(t.labels));
      scrollToBottom();
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
      setTask((prev) => (prev ? { ...prev, ...res.task } : null));
      onTaskUpdated(res.task);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Subtasks
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !newSubtaskTitle.trim()) return;
    try {
      const res = await api.addSubtask(taskId, newSubtaskTitle.trim());
      setTask((prev) =>
        prev ? { ...prev, subtasks: [...(prev.subtasks || []), res.subtask] } : null
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
              subtasks: prev.subtasks?.map((s) => (s.id === subtaskId ? res.subtask : s)),
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
        prev ? { ...prev, subtasks: prev.subtasks?.filter((s) => s.id !== subtaskId) } : null
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Chat Image Upload
  const handleChatImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingChatImg(true);
    try {
      const res = await api.uploadMedia(file);
      setChatImageUrl(res.fileUrl);
    } catch (err) {
      console.error('Chat image upload failed:', err);
    } finally {
      setIsUploadingChatImg(false);
      if (chatImgInputRef.current) chatImgInputRef.current.value = '';
    }
  };

  // Send In-Task Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || (!chatComment.trim() && !chatImageUrl)) return;

    setIsSendingComment(true);
    try {
      const res = await api.addComment(
        taskId,
        chatComment.trim() || 'Shared an image',
        chatImageUrl || undefined
      );
      setTask((prev) =>
        prev
          ? {
              ...prev,
              comments: [...(prev.comments || []), res.comment],
            }
          : null
      );
      setChatComment('');
      setChatImageUrl(null);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSendingComment(false);
    }
  };

  // Upload Task Attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!taskId || !file) return;

    setIsUploadingAttachment(true);
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
      console.error('Attachment upload failed:', err);
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Upload/Set Cover Image
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!taskId || !file) return;

    try {
      const res = await api.uploadMedia(file);
      setCoverImage(res.fileUrl);
      handleSaveField({ coverImage: res.fileUrl });
    } catch (err) {
      console.error('Cover upload failed:', err);
    } finally {
      if (coverInputRef.current) coverInputRef.current.value = '';
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
    if (!newLabelInput.trim() || labels.includes(newLabelInput.trim())) return;
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

  // Compute Subtask Progress
  const completedSubtasksCount = task?.subtasks?.filter((s) => s.isCompleted).length || 0;
  const totalSubtasksCount = task?.subtasks?.length || 0;
  const subtasksPercent =
    totalSubtasksCount > 0 ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-white border border-slate-200/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Cover Image Banner (if available) */}
        {coverImage && (
          <div className="relative w-full h-40 bg-slate-100 overflow-hidden group border-b border-slate-200">
            <img src={coverImage} alt="Task Cover" className="w-full h-full object-cover" />
            <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-medium hover:bg-black/80 transition"
              >
                Change Cover
              </button>
              <button
                type="button"
                onClick={() => {
                  setCoverImage(null);
                  handleSaveField({ coverImage: null });
                }}
                className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-600 transition"
                title="Remove Cover"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            {/* Task Key & Number */}
            <span className="font-mono text-xs font-bold text-[#7B68EE] bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60">
              {task?.project?.key || 'APP'}-{task?.taskNumber || '101'}
            </span>

            {/* List name pill */}
            {task?.list && (
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <span>📁 {task.list.name}</span>
                <span className="text-slate-300">/</span>
              </span>
            )}

            {/* Status Dropdown */}
            <select
              value={columnId}
              onChange={(e) => {
                const nextCol = e.target.value;
                setColumnId(nextCol);
                handleSaveField({ columnId: nextCol });
              }}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#7B68EE]"
            >
              {columns.map((col) => (
                <option key={col.id} value={col.id}>
                  ● {col.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {!coverImage && (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                Add Cover
              </button>
            )}
            <input
              type="file"
              ref={coverInputRef}
              onChange={handleCoverUpload}
              accept="image/*"
              className="hidden"
            />

            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (Split View) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* LEFT PANE: Task Specifications, Properties, Subtasks, Attachments (7 Cols) */}
          <div className="md:col-span-7 p-6 space-y-6 overflow-y-auto">
            {isLoading ? (
              <div className="py-20 text-center text-xs text-slate-400">Loading task details...</div>
            ) : (
              <>
                {/* Title */}
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => {
                      if (title.trim() && title !== task?.title) {
                        handleSaveField({ title: title.trim() });
                      }
                    }}
                    placeholder="Task title..."
                    className="w-full text-xl font-bold text-slate-900 placeholder:text-slate-300 border-0 focus:outline-none focus:ring-0 px-0 bg-transparent"
                  />
                </div>

                {/* ClickUp Properties Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-100">
                  {/* Priority */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => {
                        const newP = e.target.value as Priority;
                        setPriority(newP);
                        handleSaveField({ priority: newP });
                      }}
                      className={cn(
                        'w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 border appearance-none transition focus:outline-none',
                        priorityConfig[priority].bg,
                        priorityConfig[priority].border,
                        priorityConfig[priority].text
                      )}
                    >
                      <option value="LOW">🏳️ Low</option>
                      <option value="MEDIUM">🟦 Normal</option>
                      <option value="HIGH">🟧 High</option>
                      <option value="URGENT">🟥 Urgent</option>
                    </select>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        handleSaveField({ dueDate: e.target.value || null });
                      }}
                      className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7B68EE]"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        handleSaveField({ startDate: e.target.value || null });
                      }}
                      className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7B68EE]"
                    />
                  </div>

                  {/* Time Estimate */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Estimate
                    </label>
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={timeEstimate}
                        onChange={(e) => setTimeEstimate(e.target.value)}
                        onBlur={() => {
                          if (timeEstimate !== (task?.timeEstimate || '')) {
                            handleSaveField({ timeEstimate: timeEstimate || null });
                          }
                        }}
                        placeholder="e.g. 4h 30m"
                        className="w-full text-xs text-slate-700 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Assignees Section */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Assignees ({task?.assignees?.length || 0})
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAssigneePickerOpen(!isAssigneePickerOpen)}
                      className="text-xs text-[#7B68EE] font-semibold hover:underline flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" />
                      {isAssigneePickerOpen ? 'Close' : '+ Edit Assignees'}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {task?.assignees?.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700"
                      >
                        {a.user.avatarUrl ? (
                          <img
                            src={a.user.avatarUrl}
                            alt={a.user.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-[#7B68EE] text-white text-[9px] flex items-center justify-center font-bold">
                            {a.user.name.charAt(0)}
                          </span>
                        )}
                        <span>{a.user.name}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleAssignee(a.userId)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          &times;
                        </button>
                      </span>
                    ))}

                    {(!task?.assignees || task.assignees.length === 0) && (
                      <span className="text-xs text-slate-400 italic">Unassigned</span>
                    )}
                  </div>

                  {isAssigneePickerOpen && (
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1 mt-1 max-h-40 overflow-y-auto shadow-inner">
                      {workspaceMembers.map((m) => {
                        const isAssigned = task?.assignees?.some((a) => a.userId === m.userId);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleAssignee(m.userId)}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition text-left',
                              isAssigned
                                ? 'bg-purple-100/70 text-[#7B68EE]'
                                : 'hover:bg-slate-200/60 text-slate-700'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {m.user.avatarUrl ? (
                                <img
                                  src={m.user.avatarUrl}
                                  alt={m.user.name}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              ) : (
                                <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                                  {m.user.name.charAt(0)}
                                </span>
                              )}
                              <span>{m.user.name}</span>
                            </div>
                            {isAssigned && <Check className="w-3.5 h-3.5 text-[#7B68EE]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => {
                      if (description !== (task?.description || '')) {
                        handleSaveField({ description: description || null });
                      }
                    }}
                    placeholder="Add task specifications, rich details, or requirements..."
                    rows={4}
                    className="w-full text-xs text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl p-3 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7B68EE] resize-y"
                  />
                </div>

                {/* Subtasks with ClickUp Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                      Subtasks ({completedSubtasksCount}/{totalSubtasksCount})
                    </label>
                    {totalSubtasksCount > 0 && (
                      <span className="text-[11px] font-semibold text-slate-500">
                        {subtasksPercent}% done
                      </span>
                    )}
                  </div>

                  {totalSubtasksCount > 0 && (
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-[#10B981] transition-all duration-300 rounded-full"
                        style={{ width: `${subtasksPercent}%` }}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 mb-2">
                    {task?.subtasks?.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between px-3 py-2 bg-slate-50/90 border border-slate-200/80 rounded-lg text-xs group hover:bg-slate-100/70 transition"
                      >
                        <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sub.isCompleted}
                            onChange={() => handleToggleSubtask(sub.id)}
                            className="rounded text-[#7B68EE] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span
                            className={cn(
                              'text-slate-700',
                              sub.isCompleted && 'line-through text-slate-400'
                            )}
                          >
                            {sub.title}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(sub.id)}
                          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Add subtask item (press Enter)..."
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#7B68EE]"
                    />
                    <button
                      type="submit"
                      disabled={!newSubtaskTitle.trim()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                    >
                      Add
                    </button>
                  </form>
                </div>

                {/* Attachments & Image Gallery */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      Attachments & Images ({task?.attachments?.length || 0})
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAttachment}
                      className="text-xs font-semibold text-[#7B68EE] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {isUploadingAttachment ? 'Uploading...' : 'Upload File'}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {task?.attachments && task.attachments.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
                      {task.attachments.map((att) => {
                        const isImg = att.isImage ?? att.fileType.startsWith('image/');
                        return (
                          <div
                            key={att.id}
                            className="relative group p-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2 overflow-hidden hover:bg-slate-100/80 transition"
                          >
                            {isImg ? (
                              <img
                                src={att.fileUrl}
                                alt={att.fileName}
                                onClick={() => setPreviewImageUrl(att.fileUrl)}
                                className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:opacity-90"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-[#7B68EE] flex items-center justify-center font-bold text-xs shrink-0">
                                DOC
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-800 truncate" title={att.fileName}>
                                {att.fileName}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {(att.fileSize / 1024).toFixed(0)} KB
                              </p>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <a
                                href={att.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                download={att.fileName}
                                className="text-slate-400 hover:text-slate-700 p-1"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No attachments uploaded yet</p>
                  )}
                </div>

                {/* Task Dependencies */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Dependencies
                  </label>

                  {task?.blockedBy && task.blockedBy.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {task.blockedBy.map((dep) => (
                        <div
                          key={dep.id}
                          className="flex items-center justify-between px-3 py-1.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-800"
                        >
                          <span>
                            ⛔ Blocked by: <strong>{dep.task?.title || 'Another task'}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedBlockerId}
                      onChange={(e) => setSelectedBlockerId(e.target.value)}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#7B68EE]"
                    >
                      <option value="">Select blocking task...</option>
                      {allTasks
                        .filter((t) => t.id !== taskId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            #{t.taskNumber} {t.title}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddDependency}
                      disabled={!selectedBlockerId}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                    >
                      Add Blocker
                    </button>
                  </div>
                </div>

                {/* Labels / Tags */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Labels & Tags
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {labels.map((lbl) => (
                      <span
                        key={lbl}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600"
                      >
                        #{lbl}
                        <button
                          type="button"
                          onClick={() => handleRemoveLabel(lbl)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newLabelInput}
                      onChange={(e) => setNewLabelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLabel();
                        }
                      }}
                      placeholder="Add tag and press Enter..."
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#7B68EE]"
                    />
                    <button
                      type="button"
                      onClick={handleAddLabel}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                    >
                      Add Tag
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT PANE: Real-time In-Task Chat & Activity History (5 Cols) */}
          <div className="md:col-span-5 p-6 bg-slate-50/60 flex flex-col justify-between overflow-hidden">
            {/* Right Pane Navigation Header */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveRightTab('chat')}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition',
                      activeRightTab === 'chat'
                        ? 'bg-purple-100/80 text-[#7B68EE]'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    In-Task Chat ({task?.comments?.length || 0})
                  </button>

                  <button
                    onClick={() => setActiveRightTab('activity')}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition',
                      activeRightTab === 'activity'
                        ? 'bg-purple-100/80 text-[#7B68EE]'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    <History className="w-3.5 h-3.5" />
                    Activity Log
                  </button>
                </div>

                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Room
                </span>
              </div>
            </div>

            {/* TAB 1: Real-time Chat Thread */}
            {activeRightTab === 'chat' && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                {/* Chat Messages List */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-2 max-h-[50vh]">
                  {(!task?.comments || task.comments.length === 0) && (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No chat messages yet. Start the conversation with your team!
                    </div>
                  )}

                  {task?.comments?.map((msg) => (
                    <div key={msg.id} className="flex gap-2.5 text-xs group">
                      {msg.user?.avatarUrl ? (
                        <img
                          src={msg.user.avatarUrl}
                          alt={msg.user.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#7B68EE] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {msg.user?.name?.charAt(0) || 'U'}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-800">{msg.user?.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(msg.createdAt), 'h:mm a')}
                          </span>
                        </div>

                        {/* Text Content */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-sm p-3 text-slate-800 shadow-sm leading-relaxed">
                          {msg.content}

                          {/* Image Attachment inside Chat */}
                          {msg.imageUrl && (
                            <div className="mt-2.5">
                              <img
                                src={msg.imageUrl}
                                alt="Shared in chat"
                                onClick={() => setPreviewImageUrl(msg.imageUrl || null)}
                                className="max-w-full h-auto max-h-48 rounded-xl object-cover cursor-pointer hover:opacity-95 border border-slate-200 shadow-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatMessagesEndRef} />
                </div>

                {/* Chat Input Box */}
                <form onSubmit={handleSendMessage} className="mt-3 pt-3 border-t border-slate-200/80">
                  {/* Image Preview thumbnail if image uploaded for message */}
                  {chatImageUrl && (
                    <div className="relative mb-2 p-1.5 bg-white border border-slate-200 rounded-xl inline-block shadow-sm">
                      <img
                        src={chatImageUrl}
                        alt="Attached preview"
                        className="w-24 h-16 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setChatImageUrl(null)}
                        className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-red-500 text-white text-xs hover:bg-red-600 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className="relative bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm focus-within:ring-1 focus-within:ring-[#7B68EE]">
                    <textarea
                      value={chatComment}
                      onChange={(e) => setChatComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder="Reply or @mention teammates (Enter to send)..."
                      rows={2}
                      className="w-full text-xs text-slate-800 placeholder:text-slate-400 border-0 focus:outline-none focus:ring-0 p-0 resize-none bg-transparent"
                    />

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => chatImgInputRef.current?.click()}
                          disabled={isUploadingChatImg}
                          className="p-1 rounded-lg text-slate-400 hover:text-[#7B68EE] hover:bg-purple-50 transition"
                          title="Share image in chat"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <input
                          type="file"
                          ref={chatImgInputRef}
                          onChange={handleChatImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <span className="text-[10px] text-slate-400">
                          {isUploadingChatImg ? 'Uploading image...' : '@mention to notify'}
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingComment || (!chatComment.trim() && !chatImageUrl)}
                        className={cn(
                          'p-1.5 rounded-lg text-white transition',
                          isSendingComment || (!chatComment.trim() && !chatImageUrl)
                            ? 'bg-slate-200 cursor-not-allowed'
                            : 'bg-[#7B68EE] hover:bg-[#6C5CE7]'
                        )}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: Activity Audit History */}
            {activeRightTab === 'activity' && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2 max-h-[55vh]">
                {(!task?.activityLogs || task.activityLogs.length === 0) && (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No activity recorded yet
                  </div>
                )}

                {task?.activityLogs?.map((log) => (
                  <div key={log.id} className="flex gap-2.5 text-xs text-slate-600">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      {log.user?.name?.charAt(0) || 'S'}
                    </div>
                    <div className="flex-1">
                      <p className="leading-snug">
                        <span className="font-semibold text-slate-800">{log.user?.name}</span>{' '}
                        <span className="text-slate-500">
                          {log.action === 'CREATED' && 'created this task'}
                          {log.action === 'STATUS_CHANGE' && 'changed status'}
                          {log.action === 'PRIORITY_CHANGE' && 'updated priority'}
                          {log.action === 'TIME_ESTIMATE_CHANGE' && 'updated time estimate'}
                          {log.action === 'ATTACHMENT_ADDED' && 'uploaded an attachment'}
                        </span>
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Image Previews */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <img src={previewImageUrl} alt="Full preview" className="w-full h-auto object-contain" />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
