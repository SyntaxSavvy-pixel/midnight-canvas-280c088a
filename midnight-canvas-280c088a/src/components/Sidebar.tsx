import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Bookmark,
  Users,
  User,
  Menu,
  Settings,
  HelpCircle,
  LogOut,
  Sparkles,
  Brain,
  ChevronDown,
  Crown,
  Plus,
  Search,
  Pencil,
  Trash2,
  Check
} from 'lucide-react';
import { SearchHistoryItem } from '@/types/auth';
import { categorizeChatsByDate } from '@/utils/dateHelpers';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  history: SearchHistoryItem[];
  userName?: string;
  userEmail?: string;
  avatarUrl?: string | null;
  subscriptionPlan?: string;
  onRenameChat?: (id: string, newTitle: string) => void;
  onDeleteChat?: (id: string) => void;
  onProfileClick?: () => void;
  onSelectChat?: (item: SearchHistoryItem) => void;
  onNewChat?: () => void;
  onLogout?: () => void;
  activeChatId?: string | null;
}

const Sidebar = ({
  isOpen,
  onToggle,
  history,
  userName = "User",
  userEmail = "user@example.com",
  avatarUrl,
  subscriptionPlan = "Free",
  onRenameChat,
  onDeleteChat,
  onProfileClick,
  onSelectChat,
  onNewChat,
  onLogout,
  activeChatId,
}: SidebarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsAnimatingOut(false);
      setIsVisible(true);
    } else if (isVisible) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimatingOut(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  const historyWithTimestamp = history.map(item => ({
    ...item,
    timestamp: item.timestamp || '',
    createdAt: new Date(item.created_at)
  }));

  const filteredHistory = historyWithTimestamp.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categorizedChats = categorizeChatsByDate(filteredHistory);

  const saveRename = (id: string) => {
    if (editTitle.trim() && onRenameChat) onRenameChat(id, editTitle.trim());
    setEditingId(null);
    setEditTitle('');
  };

  return (
    <div className={`shrink-0 transition-all duration-250 ${isOpen ? 'w-[250px]' : 'w-10'}`}>
      {/* Collapsed state - just menu icon */}
      {!isOpen && !isVisible && (
        <div className="h-screen p-2">
          <button onClick={onToggle} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <Menu className="w-5 h-5 text-[#666]" />
          </button>
        </div>
      )}

      {/* Open sidebar */}
      {(isVisible || isOpen) && (
        <aside className={`h-screen w-[250px] flex flex-col bg-[#171717] transition-all duration-250 ${isOpen && !isAnimatingOut ? 'opacity-100' : 'opacity-0 -translate-x-2'}`}>

          {/* Header with logo and menu */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="TabKeep" className="w-7 h-7" />
              <span className="text-base font-semibold text-[#ccc]">TabKeep</span>
            </div>
            <button onClick={onToggle} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <Menu className="w-5 h-5 text-[#666]" />
            </button>
          </div>

          {/* Navigation buttons - vertical stack */}
          <div className="px-3 pb-3 space-y-1">
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#202020] text-[#ccc] text-sm font-medium hover:bg-[#252525] transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Ask
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#888] text-sm font-medium hover:bg-[#202020] transition-colors">
              <Bookmark className="w-4 h-4" />
              Saved Tabs
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#888] text-sm font-medium hover:bg-[#202020] transition-colors">
              <Users className="w-4 h-4" />
              Community
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#202020] text-sm text-[#ccc] placeholder:text-[#444] border-none focus:outline-none focus:ring-1 focus:ring-[#333]"
              />
            </div>
          </div>

          {/* Chat history */}
          <div className="flex-1 overflow-y-auto px-3 pt-2 scrollbar-hide">
            {history.length === 0 ? (
              <p className="px-3 py-4 text-xs text-[#444] text-center">No chats yet</p>
            ) : filteredHistory.length === 0 ? (
              <p className="px-3 py-4 text-xs text-[#444] text-center">No results</p>
            ) : (
              Object.entries(categorizedChats).map(([category, chats]) => {
                if (chats.length === 0) return null;
                return (
                  <div key={category} className="mb-3">
                    <p className="px-3 py-1 text-[11px] text-[#555] font-medium">{category}</p>
                    {chats.map((item) => {
                      const originalItem = history.find(h => h.id === item.id);
                      const isActive = activeChatId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="group"
                          onMouseEnter={() => setHoveredId(item.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          {editingId === item.id ? (
                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#202020]">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveRename(item.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                className="flex-1 bg-transparent text-sm text-[#ccc] focus:outline-none"
                                autoFocus
                              />
                              <button onClick={() => saveRename(item.id)} className="p-1 rounded hover:bg-white/10">
                                <Check className="w-3 h-3 text-[#666]" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => originalItem && onSelectChat?.(originalItem)}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors ${isActive ? 'bg-white/5' : 'hover:bg-white/[0.03]'}`}
                            >
                              <span className={`text-sm truncate flex-1 ${isActive ? 'text-[#ccc]' : 'text-[#888]'}`}>{item.title}</span>
                              {hoveredId === item.id && (
                                <div className="flex gap-0.5 shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditTitle(item.title); }}
                                    className="p-1 rounded hover:bg-white/10"
                                  >
                                    <Pencil className="w-3 h-3 text-[#555]" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteChat?.(item.id); }}
                                    className="p-1 rounded hover:bg-white/10"
                                  >
                                    <Trash2 className="w-3 h-3 text-[#555]" />
                                  </button>
                                </div>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Profile section */}
          <div className="relative p-3 border-t border-[#222]" ref={profileMenuRef}>
            {/* Dropdown menu */}
            {profileMenuOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-1 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden">
                {/* User info */}
                <div className="p-3 border-b border-[#2a2a2a]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center overflow-hidden shrink-0">
                      {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-[#666]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#ccc] truncate font-medium">{userName}</p>
                      <p className="text-xs text-[#555] truncate">{userEmail}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${subscriptionPlan === 'Pro' ? 'bg-amber-500/10 text-amber-400' : 'bg-[#252525] text-[#666]'}`}>
                      {subscriptionPlan === 'Pro' && <Crown className="w-3 h-3" />}
                      {subscriptionPlan}
                    </span>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#999] hover:bg-white/5 transition-colors">
                    <Brain className="w-4 h-4" />
                    <span>Memory</span>
                    <span className="ml-auto text-[10px] text-[#444] bg-[#252525] px-1.5 py-0.5 rounded">Beta</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#999] hover:bg-white/5 transition-colors">
                    <Users className="w-4 h-4" />
                    <span>Community</span>
                  </button>
                  <button onClick={() => { setProfileMenuOpen(false); onProfileClick?.(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#999] hover:bg-white/5 transition-colors">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#999] hover:bg-white/5 transition-colors">
                    <HelpCircle className="w-4 h-4" />
                    <span>Help</span>
                  </button>

                  <div className="my-1 mx-3 border-t border-[#2a2a2a]" />

                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-primary hover:bg-white/5 transition-colors">
                    <Sparkles className="w-4 h-4" />
                    <span>Upgrade</span>
                  </button>

                  <div className="my-1 mx-3 border-t border-[#2a2a2a]" />

                  <button onClick={() => { setProfileMenuOpen(false); onLogout?.(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#999] hover:bg-white/5 transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}

            {/* Profile button */}
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors ${profileMenuOpen ? 'bg-white/5' : 'hover:bg-white/[0.03]'}`}
            >
              <div className="w-7 h-7 rounded-full bg-[#2a2a2a] flex items-center justify-center overflow-hidden shrink-0">
                {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-3.5 h-3.5 text-[#666]" />}
              </div>
              <span className="flex-1 text-left text-sm text-[#ccc] truncate">{userName}</span>
              <ChevronDown className={`w-4 h-4 text-[#444] transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};

export default Sidebar;
