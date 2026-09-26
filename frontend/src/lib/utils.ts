import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { Priority } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDueDate(dateString?: string | null): { text: string; isOverdue: boolean } {
  if (!dateString) return { text: '', isOverdue: false };

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    const past = isPast(date) && !isToday(date);

    if (isToday(date)) return { text: 'Today', isOverdue: false };
    if (isTomorrow(date)) return { text: 'Tomorrow', isOverdue: false };

    return {
      text: format(date, 'MMM d'),
      isOverdue: past,
    };
  } catch {
    return { text: dateString, isOverdue: false };
  }
}

export function getPriorityBadge(priority: Priority): {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (priority) {
    case 'URGENT':
      return {
        label: 'Urgent',
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-500/30',
        dot: 'bg-rose-500',
      };
    case 'HIGH':
      return {
        label: 'High',
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/30',
        dot: 'bg-amber-500',
      };
    case 'MEDIUM':
      return {
        label: 'Medium',
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500/30',
        dot: 'bg-blue-500',
      };
    case 'LOW':
    default:
      return {
        label: 'Low',
        bg: 'bg-slate-500/10 dark:bg-slate-500/20',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-500/30',
        dot: 'bg-slate-400',
      };
  }
}

export function parseLabels(labels: string | string[]): string[] {
  if (Array.isArray(labels)) return labels;
  try {
    return JSON.parse(labels);
  } catch {
    return [];
  }
}
