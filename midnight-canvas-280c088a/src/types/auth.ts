import { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchHistoryItem {
  id: string;
  user_id: string;
  title: string;
  initial_query: string;
  created_at: string;
  updated_at: string;
  messages?: any;
  timestamp?: string; // For UI compatibility with existing code
}

export interface AuthState {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  displayName: string;
  username?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  display_name?: string;
  username?: string;
  avatar_url?: string;
}
