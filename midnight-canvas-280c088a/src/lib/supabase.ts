import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          username: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      search_history: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          initial_query: string;
          created_at: string;
          updated_at: string;
          messages: any;
          is_deleted: boolean;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          initial_query: string;
          created_at?: string;
          updated_at?: string;
          messages?: any;
          is_deleted?: boolean;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          initial_query?: string;
          created_at?: string;
          updated_at?: string;
          messages?: any;
          is_deleted?: boolean;
          deleted_at?: string | null;
        };
      };
    };
  };
}
