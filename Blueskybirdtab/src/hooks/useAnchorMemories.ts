/**
 * useAnchorMemories Hook
 * Manages memories within a specific memory anchor
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export interface AnchorMemory {
  id: string;
  memory_type: string;
  content: string;
  memory_source: 'explicit' | 'implicit' | 'system';
  importance: number;
  created_at: string;
  updated_at: string;
}

export interface AddMemoryParams {
  content: string;
  memoryType?: 'preference' | 'fact' | 'style';
}

export interface UpdateMemoryParams {
  memoryId: string;
  content?: string;
  memoryType?: string;
}

const API_URL = import.meta.env.VITE_API_URL || '';

export const useAnchorMemories = (anchorId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch memories for the anchor
  const {
    data: memories = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['anchorMemories', anchorId],
    queryFn: async () => {
      if (!user || !anchorId) return [];

      const response = await fetch(
        `${API_URL}/api/anchors/${anchorId}/memories?userId=${user.id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch memories');
      }

      const data = await response.json();
      return (data.memories || []) as AnchorMemory[];
    },
    enabled: !!user && !!anchorId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Add a new explicit memory
  const addMemoryMutation = useMutation({
    mutationFn: async (params: AddMemoryParams) => {
      if (!user || !anchorId) throw new Error('User or anchor not available');

      const response = await fetch(`${API_URL}/api/anchors/${anchorId}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          content: params.content,
          memoryType: params.memoryType || 'fact',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add memory');
      }

      const data = await response.json();
      return data.memory as AnchorMemory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anchorMemories', anchorId] });
      // Also invalidate anchor list to update memory count
      queryClient.invalidateQueries({ queryKey: ['memoryAnchors', user?.id] });
    },
  });

  // Update a memory
  const updateMemoryMutation = useMutation({
    mutationFn: async (params: UpdateMemoryParams) => {
      if (!user || !anchorId) throw new Error('User or anchor not available');

      const response = await fetch(`${API_URL}/api/anchors/${anchorId}/memories`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          memoryId: params.memoryId,
          content: params.content,
          memoryType: params.memoryType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update memory');
      }

      const data = await response.json();
      return data.memory as AnchorMemory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anchorMemories', anchorId] });
    },
  });

  // Delete a memory
  const deleteMemoryMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      if (!user || !anchorId) throw new Error('User or anchor not available');

      const response = await fetch(`${API_URL}/api/anchors/${anchorId}/memories`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          memoryId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete memory');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anchorMemories', anchorId] });
      // Also invalidate anchor list to update memory count
      queryClient.invalidateQueries({ queryKey: ['memoryAnchors', user?.id] });
    },
  });

  // Clear all memories (delete all)
  const clearAllMemoriesMutation = useMutation({
    mutationFn: async () => {
      if (!user || !anchorId) throw new Error('User or anchor not available');

      // Delete each memory
      const deletePromises = memories.map(memory =>
        deleteMemoryMutation.mutateAsync(memory.id)
      );

      await Promise.all(deletePromises);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anchorMemories', anchorId] });
      queryClient.invalidateQueries({ queryKey: ['memoryAnchors', user?.id] });
    },
  });

  // Group memories by type
  const explicitMemories = memories.filter(m => m.memory_source === 'explicit');
  const implicitMemories = memories.filter(m => m.memory_source === 'implicit' || !m.memory_source);

  return {
    memories,
    explicitMemories,
    implicitMemories,
    isLoading,
    error,
    refetch,
    addMemory: addMemoryMutation.mutateAsync,
    updateMemory: updateMemoryMutation.mutateAsync,
    deleteMemory: deleteMemoryMutation.mutateAsync,
    clearAllMemories: clearAllMemoriesMutation.mutateAsync,
    isAdding: addMemoryMutation.isPending,
    isUpdating: updateMemoryMutation.isPending,
    isDeleting: deleteMemoryMutation.isPending,
    isClearing: clearAllMemoriesMutation.isPending,
  };
};
