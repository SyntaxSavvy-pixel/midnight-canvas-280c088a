import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Bookmark,
  Users,
  User,
  Menu,
  X,
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

type NavItem = 'ask' | 'save-tabs' | 'community';

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
  const [activeNav, setActiveNav] = useState<NavItem>('ask');
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
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  // Filter and categorize chats
  const historyWithTimestamp = history.map(item => ({
    ...item,
    timestamp: item.timestamp || '',
    createdAt: new Date(item.created_at)
  }));

  const filteredHistory = historyWithTimestamp.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categorizedChats = categorizeChatsByDate(filteredHistory);

  const handleRename = (id: string) => {
    const chat = history.find(c => c.id === id);
    if (chat) {
      setEditingId(id);
      setEditTitle(chat.title);
    }
  };

  const saveRename = (id: string) => {
    if (editTitle.trim() && onRenameChat) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleSelectChat = (item: SearchHistoryItem) => {
    if (onSelectChat) {
      onSelectChat(item);
    }
  };

  const navItems = [
    { id: 'ask' as NavItem, label: 'Ask', icon: MessageSquare },
    { id: 'save-tabs' as NavItem, label: 'Save Tabs', icon: Bookmark },
    { id: 'community' as NavItem, label: 'Community', icon: Users },
  ];

  return (
    <>
      <div
        className={`
          shrink-0 transition-all duration-300 ease-out
          ${isOpen ? 'w-72' : 'w-14'}
        `}
      >
        {/* Collapsed state */}
        {!isOpen && !isVisible && (
          <div className="h-screen p-2">
            <button
              onClick={onToggle}
              className="
                p-2.5 rounded-xl
                bg-[#1a1a1f]/80 backdrop-blur-sm
                border border-[#2a2a32]
                hover:bg-[#22222a] hover:border-[#3a3a44]
                transition-all duration-200
              "
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5 text-[#8a8a96]" />
            </button>
          </div>
        )}

        {/* Sidebar panel */}
        {(isVisible || isOpen) && (
          <aside
            className={`
              h-screen p-2 flex
              transition-all duration-300 ease-out
              ${isOpen && !isAnimatingOut
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-2'
              }
            `}
          >
            <div className="
              flex flex-col flex-1
              bg-[#16161a]/95 backdrop-blur-xl
              border border-[#26262e]
              rounded-2xl
              overflow-hidden
            ">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-3 border-b border-[#26262e]">
                <button
                  onClick={onToggle}
                  className="p-2 rounded-lg hover:bg-[#22222a] transition-colors"
                >
                  <X className="w-4 h-4 text-[#6a6a76]" />
                </button>

                <button
                  onClick={onNewChat}
                  className="
                    flex items-center gap-2 px-3 py-2 rounded-xl
                    bg-[#22222a] hover:bg-[#2a2a34]
                    border border-[#32323c]
                    transition-all duration-200
                  "
                >
                  <Plus className="w-4 h-4 text-[#9a9aa6]" />
                  <span className="text-sm text-[#c0c0cc]">New Chat</span>
                </button>
              </div>

              {/* Simple Navigation */}
              <div className="px-2 py-2 border-b border-[#26262e]">
                <div className="flex gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeNav === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveNav(item.id)}
                        className={`
                          flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg
                          transition-all duration-200 text-xs font-medium
                          ${isActive
                            ? 'bg-[#26262e] text-[#e0e0ec]'
                            : 'text-[#6a6a76] hover:text-[#9a9aa6] hover:bg-[#1e1e24]'
                          }
                        `}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search */}
              <div className="px-3 py-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4a4a56]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="
                      w-full pl-9 pr-3 py-2 rounded-lg
                      bg-[#1e1e24] border border-[#2a2a32]
                      text-sm text-[#c0c0cc]
                      placeholder:text-[#4a4a56]
                      focus:outline-none focus:border-[#3a3a44]
                      transition-colors
                    "
                  />
                </div>
              </div>

              {/* Chat History */}
              <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-hide">
                {activeNav === 'ask' && (
                  <>
                    {history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <div className="w-10 h-10 rounded-xl bg-[#22222a] flex items-center justify-center mb-3">
                          <MessageSquare className="w-5 h-5 text-[#4a4a56]" />
                        </div>
                        <p className="text-xs text-[#5a5a66]">
                          No conversations yet
                        </p>
                        <p className="text-xs text-[#3a3a46] mt-1">
                          Start a new chat above
                        </p>
                      </div>
                    ) : filteredHistory.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-xs text-[#5a5a66]">No results found</p>
                      </div>
                    ) : (
                      <div className="space-y-3 pb-2">
                        {Object.entries(categorizedChats).map(([category, chats]) => {
                          if (chats.length === 0) return null;
                          return (
                            <div key={category}>
                              <div className="px-2 py-1.5">
                                <p className="text-[10px] font-medium text-[#4a4a56] uppercase tracking-wider">
                                  {category}
                                </p>
                              </div>
                              <div className="space-y-0.5">
                                {chats.map((item) => {
                                  const originalItem = history.find(h => h.id === item.id);
                                  const isActive = activeChatId === item.id;

                                  return (
                                    <div
                                      key={item.id}
                                      className="group relative"
                                      onMouseEnter={() => setHoveredId(item.id)}
                                      onMouseLeave={() => setHoveredId(null)}
                                    >
                                      {editingId === item.id ? (
                                        <div className="flex items-center gap-1 px-2 py-2 rounded-lg bg-[#22222a]">
                                          <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveRename(item.id);
                                              if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            className="flex-1 bg-transparent text-sm text-[#c0c0cc] focus:outline-none"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => saveRename(item.id)}
                                            className="p-1 hover:bg-[#2a2a34] rounded"
                                          >
                                            <Check className="w-3.5 h-3.5 text-[#7a7a86]" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => originalItem && handleSelectChat(originalItem)}
                                          className={`
                                            w-full px-2 py-2 rounded-lg text-left
                                            flex items-center gap-2
                                            transition-all duration-150
                                            ${isActive
                                              ? 'bg-[#26262e]'
                                              : 'hover:bg-[#1e1e24]'
                                            }
                                          `}
                                        >
                                          <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-[#4a4a56]'}`} />
                                          <span className={`text-sm truncate flex-1 ${isActive ? 'text-[#e0e0ec]' : 'text-[#9a9aa6]'}`}>
                                            {item.title}
                                          </span>

                                          {hoveredId === item.id && (
                                            <div className="flex items-center gap-0.5">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleRename(item.id);
                                                }}
                                                className="p-1 hover:bg-[#2a2a34] rounded"
                                              >
                                                <Pencil className="w-3 h-3 text-[#6a6a76]" />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onDeleteChat?.(item.id);
                                                }}
                                                className="p-1 hover:bg-red-500/10 rounded"
                                              >
                                                <Trash2 className="w-3 h-3 text-red-400/70" />
                                              </button>
                                            </div>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {activeNav === 'save-tabs' && (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <div className="w-10 h-10 rounded-xl bg-[#22222a] flex items-center justify-center mb-3">
                      <Bookmark className="w-5 h-5 text-[#4a4a56]" />
                    </div>
                    <p className="text-xs text-[#5a5a66]">Save Tabs</p>
                    <p className="text-xs text-[#3a3a46] mt-1">Coming soon</p>
                  </div>
                )}

                {activeNav === 'community' && (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <div className="w-10 h-10 rounded-xl bg-[#22222a] flex items-center justify-center mb-3">
                      <Users className="w-5 h-5 text-[#4a4a56]" />
                    </div>
                    <p className="text-xs text-[#5a5a66]">Community</p>
                    <p className="text-xs text-[#3a3a46] mt-1">Coming soon</p>
                  </div>
                )}
              </div>

              {/* Profile Section */}
              <div className="p-2 border-t border-[#26262e]" ref={profileMenuRef}>
                {/* Dropdown Menu */}
                {profileMenuOpen && (
                  <div className="
                    absolute bottom-16 left-2 right-2 mx-2 mb-1
                    bg-[#1a1a1f] border border-[#2a2a32]
                    rounded-xl overflow-hidden
                    shadow-xl shadow-black/50
                    z-50
                  ">
                    {/* User Info */}
                    <div className="px-3 py-3 border-b border-[#26262e]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-[#2a2a32]">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <User className="w-4 h-4 text-primary/70" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#e0e0ec] truncate">{userName}</p>
                          <p className="text-xs text-[#6a6a76] truncate">{userEmail}</p>
                        </div>
                      </div>
                      <div className="mt-2.5">
                        <span className={`
                          inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs
                          ${subscriptionPlan === 'Pro'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-[#22222a] text-[#7a7a86] border border-[#2a2a32]'
                          }
                        `}>
                          {subscriptionPlan === 'Pro' && <Crown className="w-3 h-3" />}
                          {subscriptionPlan}
                        </span>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#22222a] transition-colors">
                        <Brain className="w-4 h-4 text-[#6a6a76]" />
                        <span className="text-sm text-[#a0a0ac]">Memory</span>
                        <span className="ml-auto text-[10px] text-[#4a4a56] bg-[#26262e] px-1.5 py-0.5 rounded">Beta</span>
                      </button>

                      <button
                        onClick={() => { setProfileMenuOpen(false); onProfileClick?.(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#22222a] transition-colors"
                      >
                        <Settings className="w-4 h-4 text-[#6a6a76]" />
                        <span className="text-sm text-[#a0a0ac]">Settings</span>
                      </button>

                      <button className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#22222a] transition-colors">
                        <HelpCircle className="w-4 h-4 text-[#6a6a76]" />
                        <span className="text-sm text-[#a0a0ac]">Help</span>
                      </button>

                      <div className="my-1 mx-3 border-t border-[#26262e]" />

                      <button className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#22222a] transition-colors">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm text-primary">Upgrade</span>
                      </button>

                      <div className="my-1 mx-3 border-t border-[#26262e]" />

                      <button
                        onClick={() => { setProfileMenuOpen(false); onLogout?.(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-500/5 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-[#6a6a76]" />
                        <span className="text-sm text-[#a0a0ac]">Log out</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Profile Button */}
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className={`
                    w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl
                    transition-all duration-200
                    ${profileMenuOpen ? 'bg-[#22222a]' : 'hover:bg-[#1e1e24]'}
                  `}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-[#2a2a32]">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <User className="w-4 h-4 text-primary/70" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm text-[#c0c0cc] truncate">{userName}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[#5a5a66] transition-transform duration-200 ${profileMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </>
  );
};

export default Sidebar;
