
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { env } from '@/config/environment';

// Use centralized environment configuration
const SUPABASE_URL = env.supabaseUrl;
const SUPABASE_ANON_KEY = env.supabaseAnonKey;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? localStorage : undefined
  },
  global: {
    headers: {
      'X-Client-Info': 'assetdex-dcim'
    }
  }
});