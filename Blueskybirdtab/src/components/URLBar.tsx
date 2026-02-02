import { useState, useRef, useEffect } from 'react';
import { Globe, Pin, RefreshCw, X, ChevronUp, ChevronDown, Lock, ExternalLink } from 'lucide-react';

interface URLBarProps {
    url: string;
    onNavigate: (url: string) => void;
    onPin?: () => void;
    onRefresh?: () => void;
    isPinned?: boolean;
    isSecure?: boolean;
    className?: string;
}

const URLBar = ({
    url,
    onNavigate,
    onPin,
    onRefresh,
    isPinned = false,
    isSecure = true,
    className = ''
}: URLBarProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(url);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditValue(url);
    }, [url]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editValue.trim()) {
            // Add protocol if missing
            let finalUrl = editValue.trim();
            if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                // Check if it looks like a URL or a search query
                if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
                    finalUrl = `https://${finalUrl}`;
                } else {
                    // Treat as Google search
                    finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}&igu=1`;
                }
            }
            onNavigate(finalUrl);
            setIsEditing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setEditValue(url);
            setIsEditing(false);
        }
    };

    const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

    if (isCollapsed) {
        return (
            <div className={`flex items-center justify-center py-1 ${className}`}>
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-all"
                    title="Show URL bar"
                >
                    <ChevronDown className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 h-10 bg-[var(--bg-surface)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] ${className}`}>
            {/* Security/Protocol Icon */}
            <div className="flex-shrink-0">
                {isSecure ? (
                    <Lock className="w-4 h-4 text-green-500" />
                ) : (
                    <Globe className="w-4 h-4 text-[var(--text-secondary)]" />
                )}
            </div>

            {/* URL Display/Input */}
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <form onSubmit={handleSubmit} className="w-full">
                        <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => {
                                setEditValue(url);
                                setIsEditing(false);
                            }}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-[var(--bg-background)] border border-[var(--border-primary)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                            placeholder="Enter URL or search..."
                        />
                    </form>
                ) : (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors group"
                    >
                        <span className="text-sm text-[var(--text-primary)] truncate block">
                            {displayUrl || 'Enter URL...'}
                        </span>
                    </button>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {/* Refresh */}
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                )}

                {/* Pin */}
                {onPin && (
                    <button
                        onClick={onPin}
                        className={`p-1.5 rounded-lg transition-all ${isPinned
                            ? 'text-[var(--theme-accent)] bg-[var(--theme-accent)]/10'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                            }`}
                        title={isPinned ? 'Unpin site' : 'Pin site'}
                    >
                        <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                    </button>
                )}

                {/* Open in new tab */}
                <button
                    onClick={() => window.open(url, '_blank')}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-all"
                    title="Open in new tab"
                >
                    <ExternalLink className="w-4 h-4" />
                </button>

                {/* Collapse */}
                <button
                    onClick={() => setIsCollapsed(true)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-all"
                    title="Hide URL bar"
                >
                    <ChevronUp className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default URLBar;
