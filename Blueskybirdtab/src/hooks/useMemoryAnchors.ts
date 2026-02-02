/**
 * useMemoryAnchors Hook
 * Manages memory anchors (persistent AI brains) for a user
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export interface MemoryAnchor {
  id: string;
  user_id: string;
  anchor_id: string;
  name: string;
  purpose: string | null;
  is_default: boolean;
  memory_count: number;
  chat_count: number;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAnchorParams {
  name: string;
  purpose?: string;
}

export interface UpdateAnchorParams {
  anchorId: string;
  name?: string;
  purpose?: string;
  isDefault?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || '';

export const useMemoryAnchors = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all anchors for the user
  const {
    data: anchors = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['memoryAnchors', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const response = await fetch(`${API_URL}/api/anchors?userId=${user.id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch anchors');
      }

      const data = await response.json();
      return (data.anchors || []) as MemoryAnchor[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get the default anchor
  const defaultAnchor = anchors.find(a => a.is_default) || anchors[0] || null;

  // Create a new anchor
  const createAnchorMutation = useMutation({
    mutationFn: async (params: CreateAnchorParams) => {
      if (!user) throw new Error('User not authenticated');

      const response = await fetch(`${API_URL}/api/anchors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: params.name,
          purpose: params.purpose,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to create anchor');
      }

      const data = await response.json();
      return data.anchor as MemoryAnchor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memoryAnchors', user?.id] });
    },
  });

  // Update an anchor
  const updateAnchorMutation = useMutation({
    mutationFn: async (params: UpdateAnchorParams) => {
      if (!user) throw new Error('User not authenticated');

      const response = await fetch(`${API_URL}/api/anchors`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          anchorId: params.anchorId,
          name: params.name,
          purpose: params.purpose,
          isDefault: params.isDefault,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to update anchor');
      }

      const data = await response.json();
      return data.anchor as MemoryAnchor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memoryAnchors', user?.id] });
    },
  });

  // Set an anchor as default
  const setDefaultAnchorMutation = useMutation({
    mutationFn: async (anchorId: string) => {
      return updateAnchorMutation.mutateAsync({ anchorId, isDefault: true });
    },
  });

  // Delete an anchor
  const deleteAnchorMutation = useMutation({
    mutationFn: async (anchorId: string) => {
      if (!user) throw new Error('User not authenticated');

      const response = await fetch(`${API_URL}/api/anchors`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          anchorId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to delete anchor');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memoryAnchors', user?.id] });
    },
  });

  // Get anchor by anchor_id
  const getAnchorById = (anchorId: string): MemoryAnchor | undefined => {
    return anchors.find(a => a.anchor_id === anchorId);
  };

  return {
    anchors,
    defaultAnchor,
    isLoading,
    error,
    refetch,
    getAnchorById,
    createAnchor: createAnchorMutation.mutateAsync,
    updateAnchor: updateAnchorMutation.mutateAsync,
    setDefaultAnchor: setDefaultAnchorMutation.mutateAsync,
    deleteAnchor: deleteAnchorMutation.mutateAsync,
    isCreating: createAnchorMutation.isPending,
    isUpdating: updateAnchorMutation.isPending,
    isDeleting: deleteAnchorMutation.isPending,
  };
};
