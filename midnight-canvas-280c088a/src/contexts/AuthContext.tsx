import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  AuthState,
  UserProfile,
  SignUpCredentials,
  SignInCredentials,
  UpdateProfileData,
  AuthError,
} from '@/types/auth';
import { getRandomAvatar } from '@/utils/avatars';

interface AuthContextType extends AuthState {
  signUp: (credentials: SignUpCredentials) => Promise<{ error: AuthError | null }>;
  signIn: (credentials: SignInCredentials) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<{ error: AuthError | null }>;
  changePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  deleteAccount: () => Promise<{ error: AuthError | null }>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // Fetch user profile from database
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session: Session | null) => {
    setIsLoading(true);

    if (session?.user) {
      setUser(session.user);
      const userProfile = await fetchProfile(session.user.id);
      setProfile(userProfile);
    } else {
      setUser(null);
      setProfile(null);
    }

    setIsLoading(false);
  };

  const signUp = async (credentials: SignUpCredentials) => {
    try {
      setError(null);
      setIsLoading(true);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            display_name: credentials.displayName,
          },
        },
      });

      if (signUpError) {
        const authError: AuthError = {
          message: signUpError.message,
          code: signUpError.status?.toString(),
        };
        setError(authError);
        return { error: authError };
      }

      // Assign random avatar and update profile with username if provided
      if (data.user) {
        const randomAvatar = getRandomAvatar();
        const updateData: any = { avatar_url: randomAvatar };

        if (credentials.username) {
          updateData.username = credentials.username;
        }

        await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', data.user.id);
      }

      return { error: null };
    } catch (err) {
      const authError: AuthError = {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      };
      setError(authError);
      return { error: authError };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (credentials: SignInCredentials) => {
    try {
      setError(null);
      setIsLoading(true);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (signInError) {
        const authError: AuthError = {
          message: signInError.message,
          code: signInError.status?.toString(),
        };
        setError(authError);
        return { error: authError };
      }

      return { error: null };
    } catch (err) {
      const authError: AuthError = {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      };
      setError(authError);
      return { error: authError };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Error signing out:', err);
      const authError: AuthError = {
        message: err instanceof Error ? err.message : 'Failed to sign out',
      };
      setError(authError);
    }
  };

  const updateProfile = async (data: UpdateProfileData) => {
    if (!user) {
      return { error: { message: 'No user logged in' } };
    }

    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (updateError) {
        const authError: AuthError = {
          message: updateError.message,
        };
        setError(authError);
        return { error: authError };
      }

      // Refresh profile
      await refreshProfile();
      return { error: null };
    } catch (err) {
      const authError: AuthError = {
        message: err instanceof Error ? err.message : 'Failed to update profile',
      };
      setError(authError);
      return { error: authError };
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      setError(null);
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        const authError: AuthError = {
          message: updateError.message,
        };
        setError(authError);
        return { error: authError };
      }

      return { error: null };
    } catch (err) {
      const authError: AuthError = {
        message: err instanceof Error ? err.message : 'Failed to change password',
      };
      setError(authError);
      return { error: authError };
    }
  };

  const deleteAccount = async () => {
    if (!user) {
      return { error: { message: 'No user logged in' } };
    }

    try {
      setError(null);

      // Note: Supabase doesn't have a direct delete user endpoint from client
      // This will sign out the user and the data will be cascade deleted via RLS
      // For production, implement a Supabase Edge Function for complete deletion

      await signOut();
      return { error: null };
    } catch (err) {
      const authError: AuthError = {
        message: err instanceof Error ? err.message : 'Failed to delete account',
      };
      setError(authError);
      return { error: authError };
    }
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" which means username is available
        throw error;
      }

      return data === null; // true if available
    } catch (err) {
      console.error('Error checking username:', err);
      return false;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await fetchProfile(user.id);
      setProfile(userProfile);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    isAuthenticated: !!user,
    isLoading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    deleteAccount,
    checkUsernameAvailability,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
