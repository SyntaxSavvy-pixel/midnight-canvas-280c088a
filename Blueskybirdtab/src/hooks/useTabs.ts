import { useMemo } from 'react';
import { useSearchHistory } from './useSearchHistory';
import { usePinnedSites } from './usePinnedSites';

export type TabType = 'chat' | 'web';

export interface Tab {
    id: string;
    type: TabType;
    title: string;
    url?: string; // Only for web
    icon?: string;
    lastActive: Date;
    isPinned: boolean;
    originalObject: any; // Keep reference to original object for actions
}

export const useTabs = (userId?: string) => {
    const { searchHistory, deleteSearch, updateSearch, isLoading: historyLoading } = useSearchHistory();
    const { pinnedSites, removePinnedSite, isLoading: pinnedLoading } = usePinnedSites(userId);

    const tabs = useMemo(() => {
        const allTabs: Tab[] = [];

        // Map Pinned Sites
        if (pinnedSites) {
            pinnedSites.forEach(site => {
                allTabs.push({
                    id: site.id,
                    type: 'web',
                    title: site.title || site.url,
                    url: site.url,
                    icon: site.favicon_url,
                    lastActive: new Date(site.created_at), // Pinned sites don't have last_active yet, use created
                    isPinned: true,
                    originalObject: site
                });
            });
        }

        // Map Chat History
        if (searchHistory) {
            searchHistory.forEach(chat => {
                // Detect if this is a Web Tab (empty messages and URL-like query)
                const isWeb = (!chat.messages || (Array.isArray(chat.messages) && chat.messages.length === 0))
                    && (chat.initial_query.startsWith('http') || chat.initial_query.includes('.'));

                const favicon = isWeb ? `https://www.google.com/s2/favicons?domain=${chat.initial_query}&sz=64` : undefined;

                allTabs.push({
                    id: chat.id,
                    type: isWeb ? 'web' : 'chat',
                    title: chat.title,
                    url: isWeb ? chat.initial_query : undefined,
                    lastActive: new Date(chat.updated_at || chat.created_at),
                    isPinned: false,
                    originalObject: chat,
                    icon: favicon
                });
            });
        }

        // Sort by Date (Pinned usually stays at top in specific section, but for "all tabs" sort by date)
        return allTabs.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
    }, [searchHistory, pinnedSites]);

    const removeTab = async (id: string, type: TabType) => {
        // Check if it is a pinned site ID
        if (pinnedSites?.some(p => p.id === id)) {
            await removePinnedSite(id);
        } else {
            // Otherwise it is search history (web or chat)
            await deleteSearch(id);
        }
    };

    const renameTab = async (id: string, type: TabType, newTitle: string) => {
        if (type === 'chat') {
            await updateSearch({ id, title: newTitle });
        }
        // Pinned sites rename not implemented in hook yet, but could be added
    };

    return {
        tabs,
        removeTab,
        renameTab,
        isLoading: historyLoading || pinnedLoading
    };
};
