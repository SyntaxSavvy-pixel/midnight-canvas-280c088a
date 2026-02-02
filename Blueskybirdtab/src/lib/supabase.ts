import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file or Vercel settings.');
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
          plan: 'free' | 'pro' | 'max';
          intelligence_used: number;
          intelligence_limit: number;
          intelligence_reset_at: string | null;
          cooldown_until: string | null;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          plan?: 'free' | 'pro' | 'max';
          intelligence_used?: number;
          intelligence_limit?: number;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          plan?: 'free' | 'pro' | 'max';
          intelligence_used?: number;
          intelligence_limit?: number;
          cooldown_until?: string | null;
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
