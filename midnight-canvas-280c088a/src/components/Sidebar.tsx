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
    <div className={`shrink-0 transition-all duration-250 ${isOpen ? 'w-64' : 'w-12'}`}>
      {/* Collapsed */}
      {!isOpen && !isVisible && (
        <div className="h-screen p-2">
          <button onClick={onToggle} className="p-2 rounded-lg hover:bg-[#1f1f1f] transition-colors">
            <Menu className="w-5 h-5 text-[#999]" />
          </button>
        </div>
      )}

      {/* Sidebar */}
      {(isVisible || isOpen) && (
        <aside className={`h-screen flex transition-all duration-250 ${isOpen && !isAnimatingOut ? 'opacity-100' : 'opacity-0 -translate-x-1'}`}>
          <div className="flex flex-col flex-1 bg-[#171717]">

            {/* Header */}
            <div className="flex items-center p-2 gap-2">
              <button onClick={onToggle} className="p-2 rounded-lg hover:bg-[#1f1f1f] transition-colors">
                <Menu className="w-5 h-5 text-[#999]" />
              </button>
              <button onClick={onNewChat} className="p-2 rounded-lg hover:bg-[#1f1f1f] transition-colors ml-auto">
                <Plus className="w-5 h-5 text-[#999]" />
              </button>
            </div>

            {/* Search */}
            <div className="px-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#1f1f1f] text-sm text-[#eee] placeholder:text-[#666] focus:outline-none"
                />
              </div>
            </div>

            {/* New Chat & Saved */}
            <div className="px-2 space-y-0.5">
              <button onClick={onNewChat} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#eee] hover:bg-[#1f1f1f] transition-colors">
                <MessageSquare className="w-4 h-4 text-[#999]" />
                <span className="text-sm">New chat</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#eee] hover:bg-[#1f1f1f] transition-colors">
                <Bookmark className="w-4 h-4 text-[#999]" />
                <span className="text-sm">Saved tabs</span>
              </button>
            </div>

            {/* Chats */}
            <div className="flex-1 overflow-y-auto px-2 pt-3 scrollbar-hide">
              {history.length === 0 ? (
                <p className="px-3 py-4 text-xs text-[#666] text-center">No chats yet</p>
              ) : filteredHistory.length === 0 ? (
                <p className="px-3 py-4 text-xs text-[#666] text-center">No results</p>
              ) : (
                Object.entries(categorizedChats).map(([category, chats]) => {
                  if (chats.length === 0) return null;
                  return (
                    <div key={category} className="mb-3">
                      <p className="px-3 py-1 text-xs text-[#666]">{category}</p>
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
                              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1f1f1f]">
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveRename(item.id);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  className="flex-1 bg-transparent text-sm text-[#eee] focus:outline-none"
                                  autoFocus
                                />
                                <button onClick={() => saveRename(item.id)} className="p-1 rounded hover:bg-[#2a2a2a]">
                                  <Check className="w-3 h-3 text-[#999]" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => originalItem && onSelectChat?.(originalItem)}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors ${isActive ? 'bg-[#1f1f1f]' : 'hover:bg-[#1a1a1a]'}`}
                              >
                                <span className={`text-sm truncate flex-1 ${isActive ? 'text-[#eee]' : 'text-[#aaa]'}`}>{item.title}</span>
                                {hoveredId === item.id && (
                                  <div className="flex gap-0.5">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditTitle(item.title); }}
                                      className="p-1 rounded hover:bg-[#2a2a2a]"
                                    >
                                      <Pencil className="w-3 h-3 text-[#777]" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onDeleteChat?.(item.id); }}
                                      className="p-1 rounded hover:bg-[#2a2a2a]"
                                    >
                                      <Trash2 className="w-3 h-3 text-[#777]" />
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
            <div className="p-2 border-t border-[#222]" ref={profileMenuRef}>
              {profileMenuOpen && (
                <div className="absolute bottom-14 left-2 right-2 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="p-3 border-b border-[#2a2a2a]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center overflow-hidden">
                        {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-[#999]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#eee] truncate">{userName}</p>
                        <p className="text-xs text-[#666] truncate">{userEmail}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded text-xs ${subscriptionPlan === 'Pro' ? 'bg-amber-500/10 text-amber-400' : 'bg-[#2a2a2a] text-[#888]'}`}>
                      {subscriptionPlan === 'Pro' && <Crown className="w-3 h-3" />}
                      {subscriptionPlan}
                    </span>
                  </div>
                  <div className="py-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#aaa] hover:bg-[#2a2a2a]">
                      <Brain className="w-4 h-4" /><span>Memory</span><span className="ml-auto text-[10px] text-[#555]">Beta</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#aaa] hover:bg-[#2a2a2a]">
                      <Users className="w-4 h-4" /><span>Community</span>
                    </button>
                    <button onClick={() => { setProfileMenuOpen(false); onProfileClick?.(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#aaa] hover:bg-[#2a2a2a]">
                      <Settings className="w-4 h-4" /><span>Settings</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#aaa] hover:bg-[#2a2a2a]">
                      <HelpCircle className="w-4 h-4" /><span>Help</span>
                    </button>
                    <div className="my-1 mx-3 border-t border-[#2a2a2a]" />
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-primary hover:bg-[#2a2a2a]">
                      <Sparkles className="w-4 h-4" /><span>Upgrade</span>
                    </button>
                    <div className="my-1 mx-3 border-t border-[#2a2a2a]" />
                    <button onClick={() => { setProfileMenuOpen(false); onLogout?.(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#aaa] hover:bg-[#2a2a2a]">
                      <LogOut className="w-4 h-4" /><span>Log out</span>
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${profileMenuOpen ? 'bg-[#1f1f1f]' : 'hover:bg-[#1a1a1a]'}`}
              >
                <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center overflow-hidden">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-[#999]" />}
                </div>
                <span className="flex-1 text-left text-sm text-[#eee] truncate">{userName}</span>
                <ChevronDown className={`w-4 h-4 text-[#666] transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

export default Sidebar;
