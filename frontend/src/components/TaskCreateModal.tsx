'use client';

import React, { useState, useRef } from 'react';
import api from '../lib/api';
import { BoardColumn, WorkspaceMember, Priority, TaskList, Task } from '../types';
import {
  X,
  Calendar,
  Clock,
  Tag,
  Paperclip,
  CheckSquare,
  Plus,
  Trash2,
  Users,
  Flag,
  Send,
  MessageSquare,
  Sparkles,
  ImageIcon,
  Check,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TaskCreateModalProps {
  projectId: string;
  listId?: string;
  lists?: TaskList[];
  defaultColumnId?: string;
  columns: BoardColumn[];
  workspaceMembers: WorkspaceMember[];
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
}

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  projectId,
  listId,
  lists = [],
  defaultColumnId,
  columns,
  workspaceMembers,
  onClose,
  onTaskCreated,
}) => {
  // Core Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [selectedListId, setSelectedListId] = useState<string>(listId || lists[0]?.id || '');
  const [columnId, setColumnId] = useState(defaultColumnId || columns[0]?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [timeEstimate, setTimeEstimate] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  // Labels
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState('');

  // Assignees
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);

  // Subtasks
  const [subtasks, setSubtasks] = useState<{ title: string; isCompleted: boolean }[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');

  // Attachments / Images
  const [uploadedAttachments, setUploadedAttachments] = useState<
    { fileName: string; fileUrl: string; fileSize: number; fileType: string; isImage: boolean }[]
  >([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // In-Task Chat while creating
  const [initialComment, setInitialComment] = useState('');
  const [chatImageUrl, setChatImageUrl] = useState<string | null>(null);
  const [isUploadingChatImg, setIsUploadingChatImg] = useState(false);
  const chatImgInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Priority helpers
  const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
    URGENT: { bg: 'bg-red-50 text-red-600', border: 'border-red-200', text: 'Urgent' },
    HIGH: { bg: 'bg-amber-50 text-amber-600', border: 'border-amber-200', text: 'High' },
    MEDIUM: { bg: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-200', text: 'Normal' },
    LOW: { bg: 'bg-slate-100 text-slate-600', border: 'border-slate-200', text: 'Low' },
  };

  const handleAddLabel = () => {
    if (labelInput.trim() && !labels.includes(labelInput.trim())) {
      setLabels([...labels, labelInput.trim()]);
      setLabelInput('');
    }
  };

  const handleRemoveLabel = (lbl: string) => {
    setLabels(labels.filter((l) => l !== lbl));
  };

  const handleAddSubtask = () => {
    if (subtaskInput.trim()) {
      setSubtasks([...subtasks, { title: subtaskInput.trim(), isCompleted: false }]);
      setSubtaskInput('');
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, idx) => idx !== index));
  };

  // Upload attachment file/image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      const res = await api.uploadMedia(file);
      setUploadedAttachments((prev) => [...prev, res]);
    } catch (err: any) {
      setError('File upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Upload cover image
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await api.uploadMedia(file);
      setCoverImageUrl(res.fileUrl);
    } catch (err: any) {
      setError('Cover upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Upload chat image
  const handleChatImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingChatImg(true);
    try {
      const res = await api.uploadMedia(file);
      setChatImageUrl(res.fileUrl);
    } catch (err: any) {
      setError('Chat image upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploadingChatImg(false);
      if (chatImgInputRef.current) chatImgInputRef.current.value = '';
    }
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await api.createTask({
        listId: selectedListId || listId,
        projectId,
        columnId: columnId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        timeEstimate: timeEstimate.trim() || undefined,
        coverImage: coverImageUrl || undefined,
        labels,
        assigneeIds: selectedAssigneeIds,
        subtasks: subtasks.map((s) => ({ title: s.title })),
        initialAttachments: uploadedAttachments,
        initialComment: initialComment.trim() || undefined,
        initialCommentImage: chatImageUrl || undefined,
      });

      onTaskCreated(res.task);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cover Image Banner (if uploaded) */}
        {coverImageUrl && (
          <div className="relative w-full h-36 bg-slate-100 overflow-hidden group border-b border-slate-200">
            <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setCoverImageUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
              title="Remove Cover Image"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-purple-50 text-[#7B68EE] text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              New ClickUp Task
            </span>

            {/* List Picker if multiple lists */}
            {lists.length > 1 && (
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#7B68EE]"
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    📁 {l.name}
                  </option>
                ))}
              </select>
            )}

            {/* Status Dropdown */}
            <select
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-[#7B68EE]"
            >
              {columns.map((col) => (
                <option key={col.id} value={col.id}>
                  ● {col.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {!coverImageUrl && (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                Add Cover Image
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
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="px-6 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-600 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')}>&times;</button>
          </div>
        )}

        {/* Modal Split View: Left (Details) & Right (Live Chat / Notes) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* LEFT PANE: Task Metadata, Description, Subtasks, Attachments (7 Cols) */}
          <div className="md:col-span-7 p-6 space-y-6 overflow-y-auto">
            {/* Title Input */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title..."
                autoFocus
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
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className={cn(
                    'w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 border appearance-none transition focus:outline-none',
                    priorityColors[priority].bg,
                    priorityColors[priority].border
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
                  onChange={(e) => setDueDate(e.target.value)}
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
                  onChange={(e) => setStartDate(e.target.value)}
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
                    placeholder="e.g. 4h"
                    className="w-full text-xs text-slate-700 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
                  />
                </div>
              </div>
            </div>

            {/* Assignees Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Assignees ({selectedAssigneeIds.length})
                </label>
                <button
                  type="button"
                  onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
                  className="text-xs text-[#7B68EE] font-semibold hover:underline flex items-center gap-1"
                >
                  <Users className="w-3 h-3" />
                  {isAssigneeOpen ? 'Done' : '+ Assign Members'}
                </button>
              </div>

              {/* Selected Assignees Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {selectedAssigneeIds.map((id) => {
                  const member = workspaceMembers.find((m) => m.userId === id);
                  if (!member) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700"
                    >
                      {member.user.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt={member.user.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-[#7B68EE] text-white text-[9px] flex items-center justify-center font-bold">
                          {member.user.name.charAt(0)}
                        </span>
                      )}
                      <span>{member.user.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleAssignee(id)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        &times;
                      </button>
                    </span>
                  );
                })}

                {selectedAssigneeIds.length === 0 && (
                  <span className="text-xs text-slate-400 italic">No assignees selected yet</span>
                )}
              </div>

              {/* Assignee Dropdown Picker */}
              {isAssigneeOpen && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1 mt-1 max-h-40 overflow-y-auto">
                  {workspaceMembers.map((m) => {
                    const isAssigned = selectedAssigneeIds.includes(m.userId);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleAssignee(m.userId)}
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
                placeholder="Add task specifications, acceptance criteria, or markdown notes..."
                rows={4}
                className="w-full text-xs text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl p-3 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7B68EE] resize-y"
              />
            </div>

            {/* Subtasks / Checklist */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                  Subtasks ({subtasks.length})
                </label>
              </div>

              <div className="space-y-1.5 mb-2">
                {subtasks.map((sub, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-700"
                  >
                    <span className="truncate">{sub.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(idx)}
                      className="text-slate-400 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Add a subtask item (press Enter)..."
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#7B68EE]"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Attachments / Uploaded Media */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  Attachments & Images ({uploadedAttachments.length})
                </label>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFile}
                  className="text-xs font-semibold text-[#7B68EE] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {isUploadingFile ? 'Uploading...' : 'Attach File'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Uploaded Attachments Grid / Thumbnails */}
              {uploadedAttachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
                  {uploadedAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="relative p-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2 group overflow-hidden"
                    >
                      {att.isImage ? (
                        <img
                          src={att.fileUrl}
                          alt={att.fileName}
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-[#7B68EE] flex items-center justify-center font-bold text-xs shrink-0">
                          DOC
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          {att.fileName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {(att.fileSize / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setUploadedAttachments(
                            uploadedAttachments.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLabel();
                    }
                  }}
                  placeholder="Type tag and press Enter..."
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
          </div>

          {/* RIGHT PANE: In-Task Chat & Team Collaboration (5 Cols) */}
          <div className="md:col-span-5 p-6 bg-slate-50/50 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200/80 mb-4">
                <MessageSquare className="w-4 h-4 text-[#7B68EE]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  In-Task Chat & Discussion
                </h3>
              </div>

              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Start a live conversation thread for this task. You can upload reference images,
                share initial specs, and @mention teammates directly.
              </p>

              {/* Chat Image Preview if attached */}
              {chatImageUrl && (
                <div className="relative mb-3 p-2 bg-white rounded-xl border border-slate-200/80 inline-block shadow-sm">
                  <img
                    src={chatImageUrl}
                    alt="Chat Attachment"
                    className="w-32 h-24 object-cover rounded-lg"
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

              {/* Comment Input */}
              <div className="relative bg-white border border-slate-200 rounded-xl p-3 shadow-sm focus-within:ring-1 focus-within:ring-[#7B68EE]">
                <textarea
                  value={initialComment}
                  onChange={(e) => setInitialComment(e.target.value)}
                  placeholder="Write initial comment or message for the team (use @name to mention)..."
                  rows={4}
                  className="w-full text-xs text-slate-800 placeholder:text-slate-400 border-0 focus:outline-none focus:ring-0 p-0 resize-none bg-transparent"
                />

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                  <button
                    type="button"
                    onClick={() => chatImgInputRef.current?.click()}
                    disabled={isUploadingChatImg}
                    className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-[#7B68EE] transition"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    {isUploadingChatImg ? 'Uploading...' : 'Share Image in Chat'}
                  </button>
                  <input
                    type="file"
                    ref={chatImgInputRef}
                    onChange={handleChatImageUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <span className="text-[10px] text-slate-400">Mini Slack channel</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !title.trim()}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition',
                  isSubmitting || !title.trim()
                    ? 'bg-purple-300 cursor-not-allowed'
                    : 'bg-[#7B68EE] hover:bg-[#6C5CE7] hover:shadow-lg'
                )}
              >
                {isSubmitting ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
