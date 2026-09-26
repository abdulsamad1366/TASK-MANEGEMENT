import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project-ref')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    console.log('✓ Supabase client initialized');
  } catch (error) {
    console.warn('⚠️ Supabase client initialization skipped:', error);
  }
} else {
  console.log('ℹ️ Running in local/standard mode (Supabase credentials optional)');
}

export { supabase };
export default supabase;
