import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface PinnedSite {
    id: string;
    user_id: string;
    url: string;
    title: string;
    favicon_url?: string;
    position: number;
    created_at: string;
}

export const usePinnedSites = (userId?: string) => {
    const [pinnedSites, setPinnedSites] = useState<PinnedSite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch pinned sites
    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }

        const fetchPinnedSites = async () => {
            try {
                setIsLoading(true);
                const { data, error } = await supabase
                    .from('pinned_sites')
                    .select('*')
                    .eq('user_id', userId)
                    .order('position', { ascending: true });

                if (error) throw error;
                setPinnedSites(data || []);
            } catch (err) {
                console.error('Error fetching pinned sites:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch pinned sites');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPinnedSites();
    }, [userId]);

    // Add a pinned site
    const addPinnedSite = async (url: string, title?: string) => {
        if (!userId) return null;

        try {
            // Get next position
            const maxPosition = pinnedSites.length > 0
                ? Math.max(...pinnedSites.map(s => s.position))
                : -1;

            // Fetch favicon
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;

            const { data, error } = await supabase
                .from('pinned_sites')
                .insert({
                    user_id: userId,
                    url,
                    title: title || new URL(url).hostname,
                    favicon_url: faviconUrl,
                    position: maxPosition + 1,
                })
                .select()
                .single();

            if (error) throw error;

            setPinnedSites(prev => [...prev, data]);
            return data;
        } catch (err) {
            console.error('Error adding pinned site:', err);
            setError(err instanceof Error ? err.message : 'Failed to add pinned site');
            return null;
        }
    };

    // Remove a pinned site
    const removePinnedSite = async (id: string) => {
        if (!userId) return false;

        try {
            const { error } = await supabase
                .from('pinned_sites')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            setPinnedSites(prev => prev.filter(site => site.id !== id));
            return true;
        } catch (err) {
            console.error('Error removing pinned site:', err);
            setError(err instanceof Error ? err.message : 'Failed to remove pinned site');
            return false;
        }
    };

    // Update pinned site position
    const updatePosition = async (id: string, newPosition: number) => {
        if (!userId) return false;

        try {
            const { error } = await supabase
                .from('pinned_sites')
                .update({ position: newPosition })
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            setPinnedSites(prev =>
                prev.map(site => (site.id === id ? { ...site, position: newPosition } : site))
                    .sort((a, b) => a.position - b.position)
            );
            return true;
        } catch (err) {
            console.error('Error updating position:', err);
            setError(err instanceof Error ? err.message : 'Failed to update position');
            return false;
        }
    };

    // Check if URL is pinned
    const isPinned = (url: string) => {
        return pinnedSites.some(site => site.url === url);
    };

    // Toggle pin status
    const togglePin = async (url: string, title?: string) => {
        const existing = pinnedSites.find(site => site.url === url);
        if (existing) {
            return await removePinnedSite(existing.id);
        } else {
            return await addPinnedSite(url, title);
        }
    };

    return {
        pinnedSites,
        isLoading,
        error,
        addPinnedSite,
        removePinnedSite,
        updatePosition,
        isPinned,
        togglePin,
    };
};
