import { useState } from 'react';
import {
  PanelLeftClose,
  Plus,
  Search,
  Archive,
  Monitor,
  LayoutGrid,
  Settings as SettingsIcon,
  X,
  Home,
  FileText,
  HelpCircle,
  MessageSquare,
  Command,
  Command,
  Pin,
  Clock
} from 'lucide-react';
import { SearchHistoryItem } from '@/types/auth';
import { categorizeChatsByDate } from '@/utils/dateHelpers';
import { MemoryAnchor } from '@/hooks/useMemoryAnchors';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeStudio from './ThemeStudio';
import SignUpButton from './SignUpButton';
import { Tab } from '@/hooks/useTabs';
import { Globe } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;

  // unified tabs
  tabs: Tab[];

  // Actions
  onRenameChat?: (id: string, newTitle: string) => void;
  onDeleteChat?: (id: string) => void;
  // Unified select
  onSelectTab?: (tab: Tab) => void;

  onNewChat?: () => void;
  onLogout?: () => void;

  // Navigation 
  onNavigate?: (path: string) => void;

  // State from parent
  activeChatId?: string | null;
  // activeTabId if generic? using activeChatId for now as string

  // Additional props
  onOpenNotes?: () => void;
  onCreateAnchor?: (name: string, purpose?: string) => Promise<MemoryAnchor>;
  onSelectAnchor?: (anchor: MemoryAnchor) => void;

  // Specific removal for web types (or handled by parent via id)
  onRemoveTab?: (id: string, type: 'chat' | 'web') => void;
}

const Sidebar = ({
  isOpen,
  onToggle,
  tabs = [],
  onRenameChat,
  onDeleteChat,
  onSelectTab,
  onNewChat,
  activeChatId,
  onNavigate,
  onRemoveTab,
  avatarUrl
}: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter tabs based on search
  const filteredTabs = tabs.filter(tab =>
    tab.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedTabs = filteredTabs.filter(t => t.isPinned);
  const recentTabs = filteredTabs.filter(t => !t.isPinned);

  const { today } = categorizeChatsByDate(recentTabs.map(item => ({
    id: item.id,
    title: item.title,
    timestamp: '',
    createdAt: item.lastActive,
    original: item
  })));

  // Only show Today's tabs as "Open Tabs"
  const openTabs = today || [];

  const handleCommand = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (searchQuery.trim()) {
        if (searchQuery.toLowerCase() === 'settings') {
          navigate('/settings');
        } else if (searchQuery.toLowerCase() === 'docs') {
          navigate('/docs');
        } else {
          // Treat as new chat query
          if (onNewChat) {
            onNewChat();
          }
        }
        setSearchQuery('');
      }
    }
  };

  const handleNavigation = (path: string) => {
    if (onNavigate) onNavigate(path);
    else navigate(path);
  }

  const saveRename = (id: string) => {
    if (editTitle.trim() && onRenameChat) onRenameChat(id, editTitle.trim());
    setEditingId(null);
    setEditTitle('');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className={`
        h-screen flex flex-col transition-all duration-300 ease-out z-20 relative glass-medium
        ${isOpen ? 'w-[260px] opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-10 pointer-events-none'}
      `}
    >
      {/* Top Section: Header & Command Bar */}
      <div className="pt-5 px-3 pb-4 shrink-0 space-y-4 min-w-[260px]">

        {/* Command Bar */}
          <div className="relative group mx-1">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-surface)] transition-all duration-200 cursor-text hover-lift shadow-soft">
            <Search className="w-3.5 h-3.5 text-[#555] group-hover:text-[#888]" />
            <input
              type="text"
              placeholder="Search or ask system..."
              className="bg-transparent border-none outline-none text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] w-full font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleCommand}
            />
            <div className="hidden group-hover:flex items-center gap-1">
              <Command className="w-3 h-3 text-[#444]" />
            </div>
          </div>
        </div>

        {/* Pinned Tabs (Favorites) */}
        <div className="space-y-[2px]">
          <h3 className="px-3 mb-1 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Favorites</h3>

          <button
            onClick={() => handleNavigation('/')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 group
                    ${isActive('/') ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'}
                `}
          >
            <Home className={`w-4 h-4 ${isActive('/') ? 'text-blue-400' : 'text-[#666] group-hover:text-[#888]'}`} />
            <span className="text-[13px] font-medium">Home</span>
          </button>

          <button
            onClick={() => handleNavigation('/settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 group
                    ${isActive('/settings') ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'}
                `}
          >
            <SettingsIcon className={`w-4 h-4 ${isActive('/settings') ? 'text-blue-400' : 'text-[#666] group-hover:text-[#888]'}`} />
            <span className="text-[13px] font-medium">Settings</span>
          </button>

          <button
            onClick={() => handleNavigation('/history')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 group
                    ${isActive('/history') ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'}
                `}
          >
            <Clock className={`w-4 h-4 ${isActive('/history') ? 'text-blue-400' : 'text-[#666] group-hover:text-[#888]'}`} />
            <span className="text-[13px] font-medium">History</span>
          </button>

          <button
            onClick={() => handleNavigation('/docs')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 group
                    ${isActive('/docs') ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'}
                `}
          >
            <FileText className={`w-4 h-4 ${isActive('/docs') ? 'text-blue-400' : 'text-[#666] group-hover:text-[#888]'}`} />
            <span className="text-[13px] font-medium">Documentation</span>
          </button>

          {/* User Pinned Tabs */}
          {pinnedTabs.length > 0 && (
            <>
              <div className="mx-4 my-2 h-[1px] bg-[var(--border-subtle)]" />
              <h3 className="px-3 mb-1 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
                <Pin className="w-3 h-3" />
                Pinned
              </h3>
              {pinnedTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab?.(tab)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] group relative"
                >
                  <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                    {tab.icon ? (
                      <img src={tab.icon} className="w-4 h-4 rounded" onError={(e) => e.currentTarget.style.display = 'none'} />
                    ) : (
                      <Globe className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="text-[13px] font-medium truncate flex-1">{tab.title}</span>

                  {/* Unpin Action */}
                  <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    <div
                      onClick={(e) => { e.stopPropagation(); onRemoveTab?.(tab.id, 'web'); }}
                      className="p-1 rounded hover:bg-[var(--bg-surface)] hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

      </div>

      <div className="mx-4 mb-2 h-[1px] bg-[var(--border-subtle)]" />

      {/* Scrollable Tabs List (Open Tabs) */}
      <div className="flex-1 overflow-y-auto px-2 scrollbar-none min-w-[260px] pt-4">
        <h3 className="px-3 mb-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Open Tabs</h3>
        <div className="space-y-[1px]">
          {openTabs.map(item => {
            const isChatActive = activeChatId === item.id;
            const original = item.original;

            return (
              <div
                key={item.id}
                className="relative group"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {editingId === item.id ? (
                  <div className="mx-1 px-2 py-1.5 bg-[#222] rounded-lg flex items-center">
                    <input
                      autoFocus
                      className="bg-transparent text-sm text-white w-full outline-none"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveRename(item.id);
                        if (e.key === 'Escape') { setEditingId(null); setEditTitle(''); }
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectTab?.(original)}
                    className={`
                        w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-left
                        transition-all duration-150
                        ${isChatActive ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'}
                      `}
                  >
                    <div className={`
                          w-4 h-4 rounded flex items-center justify-center shrink-0
                          ${isChatActive ? 'text-blue-400' : 'text-[#444]'}
                      `}>
                      {original.type === 'web' ? (
                        original.icon ? <img src={original.icon} className="w-4 h-4 rounded" /> : <Globe className="w-3.5 h-3.5" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <span className="text-[13px] font-medium truncate flex-1 leading-relaxed">
                      {item.title}
                    </span>

                    {(hoveredId === item.id && !isChatActive) && (
                      <div className="flex items-center gap-1 opacity-100 transition-opacity">
                        <div
                          onClick={(e) => { e.stopPropagation(); onRemoveTab?.(item.id, original.type); }}
                          className="p-1 rounded hover:bg-[#ffffff15] text-[#666] hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </div>
                      </div>
                    )}
                  </button>
                )}
              </div>
            );
          })}
          {openTabs.length === 0 && (
            <div className="px-3 py-4 text-xs text-[var(--text-secondary)] italic text-center opacity-50">
              No open tabs
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="p-3 mt-auto min-w-[260px] glass-subtle border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between px-2 gap-2">

          {/* User Profile */}
          <SignUpButton
            isAuthenticated={true}
            avatarUrl={avatarUrl}
            onClick={() => handleNavigation('/settings')}
          />

          <div className="h-4 w-[1px] bg-[var(--border-subtle)]" />

          {/* Theme Studio */}
          <div className="flex items-center justify-center">
            <ThemeStudio />
          </div>

          <div className="flex-1" />

          {/* New Chat (Compact) */}
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 px-3 py-2 text-[var(--text-primary)] transition-all hover-lift press-down bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)]"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-medium">New</span>
          </button>

          {/* Collapse */}
          <button
            onClick={onToggle}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-all"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside >
  );
};

export default Sidebar;
