import { useState } from 'react';
import { Pin, X, ExternalLink } from 'lucide-react';
import { PinnedSite } from '@/hooks/usePinnedSites';

interface PinnedSitesProps {
    sites: PinnedSite[];
    onNavigate: (url: string) => void;
    onRemove: (id: string) => void;
    isLoading?: boolean;
}

const PinnedSites = ({ sites, onNavigate, onRemove, isLoading = false }: PinnedSitesProps) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="px-3 py-2">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs">
                    <div className="w-3 h-3 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
                    <span>Loading pinned sites...</span>
                </div>
            </div>
        );
    }

    if (sites.length === 0) {
        return (
            <div className="px-3 py-2">
                <p className="text-xs text-[var(--text-secondary)] italic">
                    No pinned sites yet. Pin sites from the URL bar.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {sites.map((site) => (
                <div
                    key={site.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredId(site.id)}
                    onMouseLeave={() => setHoveredId(null)}
                >
                    <button
                        onClick={() => onNavigate(site.url)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                    >
                        {/* Favicon */}
                        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                            {site.favicon_url ? (
                                <img
                                    src={site.favicon_url}
                                    alt=""
                                    className="w-4 h-4 rounded"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <Pin className="w-3.5 h-3.5" />
                            )}
                        </div>

                        {/* Title */}
                        <span className="text-[13px] font-medium truncate flex-1">
                            {site.title}
                        </span>

                        {/* Actions (on hover) */}
                        {hoveredId === site.id && (
                            <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(site.url, '_blank');
                                    }}
                                    className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    title="Open in new tab"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(site.id);
                                    }}
                                    className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-red-400"
                                    title="Unpin"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </button>
                </div>
            ))}
        </div>
    );
};

export default PinnedSites;
