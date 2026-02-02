import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SearchHistoryItem } from '@/types/auth';
import { formatDistanceToNow } from 'date-fns';

export const useSearchHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch search history
  const { data: searchHistory = [], isLoading, error } = useQuery({
    queryKey: ['searchHistory', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to match existing UI format
      return (data || []).map((item: any) => ({
        ...item,
        timestamp: formatDistanceToNow(new Date(item.created_at), { addSuffix: true }),
      })) as SearchHistoryItem[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Add search to history
  const addSearchMutation = useMutation({
    mutationFn: async (params: { title: string; initialQuery: string; messages?: any; anchorId?: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('search_history')
        .insert({
          user_id: user.id,
          title: params.title,
          initial_query: params.initialQuery,
          messages: params.messages || [],
          anchor_id: params.anchorId || null, // Link to memory anchor
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory', user?.id] });
    },
  });

  // Update search (rename)
  const updateSearchMutation = useMutation({
    mutationFn: async (params: { id: string; title?: string; messages?: any }) => {
      const { error } = await supabase
        .from('search_history')
        .update({
          ...(params.title && { title: params.title }),
          ...(params.messages && { messages: params.messages }),
        })
        .eq('id', params.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory', user?.id] });
    },
  });

  // Delete search
  const deleteSearchMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory', user?.id] });
    },
  });

  return {
    searchHistory,
    isLoading,
    error,
    addSearch: addSearchMutation.mutate as (
      params: { title: string; initialQuery: string; messages?: any; anchorId?: string },
      options?: { onSuccess?: (data: any) => void }
    ) => void,
    updateSearch: updateSearchMutation.mutate,
    deleteSearch: deleteSearchMutation.mutate,
    isAdding: addSearchMutation.isPending,
    isUpdating: updateSearchMutation.isPending,
    isDeleting: deleteSearchMutation.isPending,
  };
};
