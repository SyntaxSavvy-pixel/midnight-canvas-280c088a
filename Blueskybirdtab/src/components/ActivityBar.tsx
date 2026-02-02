import { useLayout } from '@/contexts/LayoutContext';
import { Layers, MessageSquare, Clock, Settings, Zap } from 'lucide-react';

const ActivityBar = () => {
    const { activePanel, setActivePanel, isSidebarOpen } = useLayout();

    const icons = [
        { id: 'tabs', icon: Layers, label: 'Tabs & Pinned' },
        { id: 'ai', icon: MessageSquare, label: 'AI Chat Studio' },
        { id: 'history', icon: Clock, label: 'History Timeline' },
    ];

    return (
        <div className="w-[50px] h-full flex flex-col items-center py-4 bg-[var(--bg-sidebar)]/80 backdrop-blur-xl border-r border-[var(--border-subtle)] z-40 shrink-0">
            {/* Logo / Brand Placeholder */}
            <div className="mb-6 p-2 text-[var(--theme-accent)]">
                <Zap className="w-5 h-5 fill-current" />
            </div>

            {icons.map(item => (
                <button
                    key={item.id}
                    onClick={() => setActivePanel(item.id as any)}
                    className={`p-3 mb-2 rounded-xl transition-all relative group ${activePanel === item.id && isSidebarOpen
                            ? 'text-[var(--theme-accent)] bg-[var(--theme-accent)]/10'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                        }`}
                    title={item.label}
                >
                    <item.icon className="w-5 h-5" />
                    {/* Active Indicator Line */}
                    {activePanel === item.id && isSidebarOpen && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[var(--theme-accent)] rounded-r-md" />
                    )}
                </button>
            ))}

            <div className="mt-auto flex flex-col gap-2">
                <button
                    onClick={() => setActivePanel('settings')}
                    className={`p-3 rounded-xl transition-all relative ${activePanel === 'settings' && isSidebarOpen
                            ? 'text-[var(--theme-accent)] bg-[var(--theme-accent)]/10'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                        }`}
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

export default ActivityBar;
