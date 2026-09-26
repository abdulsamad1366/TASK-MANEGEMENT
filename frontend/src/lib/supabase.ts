import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kizmafwjqsjpfcuduaqp.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Upload a file directly to Supabase Storage bucket ('attachments')
 */
export async function uploadToSupabaseStorage(
  file: File,
  folder = 'tasks'
): Promise<{ fileUrl: string; fileName: string; fileSize: number; fileType: string; isImage: boolean }> {
  const isImage = file.type.startsWith('image/');
  const fileExt = file.name.split('.').pop() || 'bin';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.warn('Supabase storage upload direct error, using API fallback:', error.message);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(data.path);

    return {
      fileUrl: publicUrlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isImage,
    };
  } catch (err) {
    // If Supabase direct upload isn't configured with anon permissions, fall back to backend API upload
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('task_access_token') : '';
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/tasks/media`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Failed to upload file to storage');
    }

    return await res.json();
  }
}

/**
 * Subscribe to Supabase Realtime changes for a specific task
 */
export function subscribeToTaskRealtime(
  taskId: string,
  onComment: (comment: any) => void,
  onTaskUpdate?: (task: any) => void
) {
  const channel = supabase
    .channel(`task:${taskId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'Comment',
        filter: `taskId=eq.${taskId}`,
      },
      (payload) => {
        onComment(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'Task',
        filter: `id=eq.${taskId}`,
      },
      (payload) => {
        if (onTaskUpdate) onTaskUpdate(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to Supabase Realtime changes for an entire workspace
 */
export function subscribeToWorkspaceRealtime(
  workspaceId: string,
  onTaskChange: (event: string, payload: any) => void
) {
  const channel = supabase
    .channel(`workspace:${workspaceId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'Task',
        filter: `workspaceId=eq.${workspaceId}`,
      },
      (payload) => {
        onTaskChange(payload.eventType, payload.new || payload.old);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
