import { useSearchHistory } from '@/hooks/useSearchHistory';
import { Search, Clock, ExternalLink } from 'lucide-react';

const HistoryPanel = () => {
    const { searchHistory, isLoading } = useSearchHistory();

    // Group by Date string (efficient)
    const groupedHistory = searchHistory?.reduce((acc, item) => {
        const date = new Date(item.created_at || Date.now());
        const dateKey = date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(item);
        return acc;
    }, {} as Record<string, typeof searchHistory>) || {};

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[var(--bg-sidebar)]">
            <div className="p-4 border-b border-[var(--border-subtle)]">
                <h2 className="font-semibold text-lg text-[var(--text-primary)] flex items-center gap-2">
                    <Clock className="w-5 h-5" /> History
                </h2>
                <div className="mt-3 relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                        type="text"
                        placeholder="Search history..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm focus:outline-none focus:border-[var(--theme-accent)] transition-colors"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
                {isLoading && <div className="text-center text-[var(--text-secondary)] py-4">Loading history...</div>}

                {!isLoading && Object.keys(groupedHistory).length === 0 && (
                    <div className="text-center text-[var(--text-secondary)] py-8">No history found</div>
                )}

                {Object.entries(groupedHistory).map(([date, items]) => (
                    <div key={date} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 sticky top-0 bg-[var(--bg-sidebar)] py-1 z-10">
                            {date}
                        </h3>

                        <div className="space-y-4 relative border-l-2 border-[var(--border-subtle)] ml-2 pl-4 py-1">
                            {items.map(item => (
                                <div key={item.id} className="relative group cursor-pointer hover:translate-x-1 transition-transform">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--bg-surface)] border-2 border-[var(--border-subtle)] group-hover:border-[var(--theme-accent)] group-hover:bg-[var(--theme-accent)] transition-colors z-20" />

                                    <div className="flex flex-col gap-0.5">
                                        <div className="text-sm font-medium text-[var(--text-primary)] truncate pr-2">
                                            {item.title || 'Untitled Visit'}
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)] truncate flex items-center gap-1">
                                            {item.initial_query.startsWith('http') ? <ExternalLink className="w-3 h-3" /> : <Search className="w-3 h-3" />}
                                            {item.initial_query}
                                        </div>
                                        <div className="text-[10px] text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity">
                                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HistoryPanel;
