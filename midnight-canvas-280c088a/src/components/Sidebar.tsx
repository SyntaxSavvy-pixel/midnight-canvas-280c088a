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
    <div className={`shrink-0 transition-all duration-250 ${isOpen ? 'w-56' : 'w-10'}`}>
      {/* Collapsed */}
      {!isOpen && !isVisible && (
        <div className="h-screen p-1.5">
          <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-[#1f1f1f] transition-colors">
            <Menu className="w-4 h-4 text-[#888]" />
          </button>
        </div>
      )}

      {/* Sidebar */}
      {(isVisible || isOpen) && (
        <aside className={`h-screen flex transition-all duration-250 ${isOpen && !isAnimatingOut ? 'opacity-100' : 'opacity-0 -translate-x-1'}`}>
          <div className="flex flex-col flex-1 bg-[#171717]">

            {/* Header */}
            <div className="flex items-center px-1.5 py-1.5 gap-1">
              <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-[#1f1f1f] transition-colors">
                <Menu className="w-4 h-4 text-[#888]" />
              </button>
              <button onClick={onNewChat} className="p-1.5 rounded-md hover:bg-[#1f1f1f] transition-colors ml-auto">
                <Plus className="w-4 h-4 text-[#888]" />
              </button>
            </div>

            {/* Search */}
            <div className="px-1.5 pb-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-7 pr-2 py-1 rounded-md bg-[#1f1f1f] text-xs text-[#ddd] placeholder:text-[#555] focus:outline-none"
                />
              </div>
            </div>

            {/* New Chat & Saved */}
            <div className="px-1.5 space-y-0.5">
              <button onClick={onNewChat} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[#ddd] hover:bg-[#1f1f1f] transition-colors">
                <MessageSquare className="w-3.5 h-3.5 text-[#888]" />
                <span className="text-xs">New chat</span>
              </button>
              <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[#ddd] hover:bg-[#1f1f1f] transition-colors">
                <Bookmark className="w-3.5 h-3.5 text-[#888]" />
                <span className="text-xs">Saved tabs</span>
              </button>
            </div>

            {/* Chats */}
            <div className="flex-1 overflow-y-auto px-1.5 pt-2 scrollbar-hide">
              {history.length === 0 ? (
                <p className="px-2 py-3 text-[10px] text-[#555] text-center">No chats yet</p>
              ) : filteredHistory.length === 0 ? (
                <p className="px-2 py-3 text-[10px] text-[#555] text-center">No results</p>
              ) : (
                Object.entries(categorizedChats).map(([category, chats]) => {
                  if (chats.length === 0) return null;
                  return (
                    <div key={category} className="mb-2">
                      <p className="px-2 py-0.5 text-[10px] text-[#555] font-medium">{category}</p>
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
                              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1f1f1f]">
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveRename(item.id);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  className="flex-1 bg-transparent text-xs text-[#ddd] focus:outline-none"
                                  autoFocus
                                />
                                <button onClick={() => saveRename(item.id)} className="p-0.5 rounded hover:bg-[#2a2a2a]">
                                  <Check className="w-3 h-3 text-[#888]" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => originalItem && onSelectChat?.(originalItem)}
                                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left transition-colors ${isActive ? 'bg-[#1f1f1f]' : 'hover:bg-[#1a1a1a]'}`}
                              >
                                <span className={`text-xs truncate flex-1 ${isActive ? 'text-[#ddd]' : 'text-[#999]'}`}>{item.title}</span>
                                {hoveredId === item.id && (
                                  <div className="flex gap-0.5 shrink-0">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditTitle(item.title); }}
                                      className="p-0.5 rounded hover:bg-[#2a2a2a]"
                                    >
                                      <Pencil className="w-2.5 h-2.5 text-[#666]" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onDeleteChat?.(item.id); }}
                                      className="p-0.5 rounded hover:bg-[#2a2a2a]"
                                    >
                                      <Trash2 className="w-2.5 h-2.5 text-[#666]" />
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

            {/* Profile */}
            <div className="p-1.5 border-t border-[#222]" ref={profileMenuRef}>
              {profileMenuOpen && (
                <div className="absolute bottom-11 left-1.5 right-1.5 bg-[#1a1a1a] border border-[#252525] rounded-md shadow-xl z-50 overflow-hidden">
                  <div className="px-2.5 py-2 border-b border-[#252525]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#2a2a2a] flex items-center justify-center overflow-hidden shrink-0">
                        {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-3.5 h-3.5 text-[#888]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#ddd] truncate">{userName}</p>
                        <p className="text-[10px] text-[#666] truncate">{userEmail}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded text-[10px] ${subscriptionPlan === 'Pro' ? 'bg-amber-500/10 text-amber-400' : 'bg-[#252525] text-[#777]'}`}>
                      {subscriptionPlan === 'Pro' && <Crown className="w-2.5 h-2.5" />}
                      {subscriptionPlan}
                    </span>
                  </div>
                  <div className="py-0.5">
                    <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#999] hover:bg-[#252525]">
                      <Brain className="w-3.5 h-3.5" /><span>Memory</span><span className="ml-auto text-[9px] text-[#555]">Beta</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#999] hover:bg-[#252525]">
                      <Users className="w-3.5 h-3.5" /><span>Community</span>
                    </button>
                    <button onClick={() => { setProfileMenuOpen(false); onProfileClick?.(); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#999] hover:bg-[#252525]">
                      <Settings className="w-3.5 h-3.5" /><span>Settings</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#999] hover:bg-[#252525]">
                      <HelpCircle className="w-3.5 h-3.5" /><span>Help</span>
                    </button>
                    <div className="my-0.5 mx-2.5 border-t border-[#252525]" />
                    <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-primary hover:bg-[#252525]">
                      <Sparkles className="w-3.5 h-3.5" /><span>Upgrade</span>
                    </button>
                    <div className="my-0.5 mx-2.5 border-t border-[#252525]" />
                    <button onClick={() => { setProfileMenuOpen(false); onLogout?.(); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#999] hover:bg-[#252525]">
                      <LogOut className="w-3.5 h-3.5" /><span>Log out</span>
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className={`w-full flex items-center gap-2 px-1.5 py-1.5 rounded-md transition-colors ${profileMenuOpen ? 'bg-[#1f1f1f]' : 'hover:bg-[#1a1a1a]'}`}
              >
                <div className="w-6 h-6 rounded-full bg-[#2a2a2a] flex items-center justify-center overflow-hidden shrink-0">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-[#888]" />}
                </div>
                <span className="flex-1 text-left text-xs text-[#ddd] truncate">{userName}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#555] transition-transform shrink-0 ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

export default Sidebar;
