import { useState, useEffect } from 'react';
import { Bookmark, FileText, User, Plus, MessageSquare, Menu, X, Search, Pencil, Trash2, Check } from 'lucide-react';
import { categorizeChatsByDate } from '@/utils/dateHelpers';
import { SearchHistoryItem } from '@/types/auth';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  history: SearchHistoryItem[];
  userName?: string;
  avatarUrl?: string | null;
  onRenameChat?: (id: string, newTitle: string) => void;
  onDeleteChat?: (id: string) => void;
  onProfileClick?: () => void;
  onSelectChat?: (item: SearchHistoryItem) => void;
  onNewChat?: () => void;
  activeChatId?: string | null;
}

const Sidebar = ({ 
  isOpen, 
  onToggle, 
  history, 
  userName = "User", 
  avatarUrl, 
  onRenameChat, 
  onDeleteChat, 
  onProfileClick,
  onSelectChat,
  onNewChat,
  activeChatId
}: SidebarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsAnimatingOut(false);
      setParticles([]);
      setIsVisible(true);
    } else if (isVisible) {
      setIsAnimatingOut(true);
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.3,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimatingOut(false);
        setParticles([]);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  // Transform history items to include timestamp for date categorization
  const historyWithTimestamp = history.map(item => ({
    ...item,
    timestamp: item.timestamp || '',
    createdAt: new Date(item.created_at)
  }));

  // Filter chats by search query
  const filteredHistory = historyWithTimestamp.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Categorize chats by date
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

  const cancelRename = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = (id: string) => {
    if (onDeleteChat) {
      onDeleteChat(id);
    }
  };

  const handleSelectChat = (item: SearchHistoryItem) => {
    if (onSelectChat) {
      onSelectChat(item);
    }
  };

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    }
  };

  return (
    <>
      {/* Toggle button - always visible, positioned in sidebar lane */}
      <div
        className={`
          shrink-0 transition-all duration-500 ease-out
          ${isOpen ? 'w-64' : 'w-14'}
        `}
      >
        {/* Collapsed state - just the toggle button */}
        {!isOpen && !isVisible && (
          <div className="h-screen p-2">
            <button
              onClick={onToggle}
              className="
                p-2.5 rounded-xl
                bg-card/40 backdrop-blur-xl
                border border-border/20
                hover:bg-secondary/50 hover:border-border/40
                transition-all duration-200
              "
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5 text-foreground/70" />
            </button>
          </div>
        )}

        {/* Sidebar panel - glassmorphism with rounded corners */}
        {(isVisible || isOpen) && (
          <aside
            className={`
              h-screen p-2 flex
              transition-all duration-500 ease-out
              ${isOpen && !isAnimatingOut
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-4'
              }
            `}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className="
              flex flex-col flex-1
              bg-card/30 backdrop-blur-2xl
              border border-border/20
              rounded-2xl
              overflow-hidden
              shadow-lg shadow-black/10
            ">
              {/* Dust particles for dissolve effect */}
              {isAnimatingOut && particles.map((particle) => (
                <div
                  key={particle.id}
                  className="absolute w-1 h-1 rounded-full bg-foreground/30 pointer-events-none"
                  style={{
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                    animation: `dust-dissolve 0.6s ease-out ${particle.delay}s forwards`,
                  }}
                />
              ))}

              {/* Header with toggle and new chat */}
              <div className="flex items-center gap-2 px-2 pt-3 pb-2">
                {/* Close button */}
                <button
                  onClick={onToggle}
                  className="p-2 rounded-lg hover:bg-secondary/50 transition-all duration-200"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5 text-foreground/70" />
                </button>

                {/* New Chat button - icon only */}
                <button 
                  onClick={handleNewChat}
                  className="
                    p-2 rounded-lg
                    hover:bg-secondary/50
                    transition-all duration-200
                  "
                  title="New Chat"
                >
                  <Plus className="w-5 h-5 text-foreground/70" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-2 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search chats..."
                    className="
                      w-full pl-9 pr-3 py-2 rounded-lg
                      bg-secondary/30 border border-border/20
                      text-sm text-foreground/80
                      placeholder:text-muted-foreground/40
                      focus:outline-none focus:bg-secondary/50 focus:border-border/40
                      transition-all duration-200
                    "
                  />
                </div>
              </div>

              {/* Chat History - scrollable area */}
              <div className="flex-1 overflow-y-auto px-2 min-h-0 scrollbar-thin scrollbar-thumb-secondary/50 scrollbar-track-transparent">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                    <MessageSquare className="w-5 h-5 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground/40">
                      Your conversations will appear here
                    </p>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                    <p className="text-xs text-muted-foreground/40">
                      No chats found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(categorizedChats).map(([category, chats]) => {
                      if (chats.length === 0) return null;
                      return (
                        <div key={category}>
                          {/* Category Label */}
                          <div className="px-2 py-1 mb-1">
                            <p className="text-xs font-medium text-muted-foreground/60">
                              {category}
                            </p>
                          </div>

                          {/* Chats in this category */}
                          <div className="space-y-1">
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
                                    // Edit mode
                                    <div className="flex items-center gap-1 px-2 py-2 rounded-lg bg-secondary/50">
                                      <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveRename(item.id);
                                          if (e.key === 'Escape') cancelRename();
                                        }}
                                        className="
                                          flex-1 bg-transparent text-sm text-foreground
                                          focus:outline-none
                                        "
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => saveRename(item.id)}
                                        className="p-1 hover:bg-secondary/70 rounded transition-colors"
                                      >
                                        <Check className="w-3.5 h-3.5 text-foreground/70" />
                                      </button>
                                      <button
                                        onClick={cancelRename}
                                        className="p-1 hover:bg-secondary/70 rounded transition-colors"
                                      >
                                        <X className="w-3.5 h-3.5 text-foreground/70" />
                                      </button>
                                    </div>
                                  ) : (
                                    // Normal mode
                                    <button
                                      onClick={() => originalItem && handleSelectChat(originalItem)}
                                      className={`
                                        w-full px-2 py-2 rounded-lg text-left
                                        hover:bg-secondary/50
                                        transition-all duration-150
                                        flex items-center gap-2
                                        ${isActive ? 'bg-secondary/60 border border-primary/30' : ''}
                                      `}
                                    >
                                      <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-foreground/40'}`} />
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm truncate group-hover:text-foreground ${isActive ? 'text-foreground font-medium' : 'text-foreground/80'}`}>
                                          {item.title}
                                        </p>
                                      </div>

                                      {/* Action buttons on hover */}
                                      {hoveredId === item.id && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRename(item.id);
                                            }}
                                            className="p-1 hover:bg-secondary/70 rounded transition-colors"
                                            title="Rename"
                                          >
                                            <Pencil className="w-3.5 h-3.5 text-foreground/70" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(item.id);
                                            }}
                                            className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                            title="Delete"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-red-500/70" />
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
              </div>

              {/* Bottom section - pinned to bottom */}
              <div className="mt-auto border-t border-border/10">
                {/* Action Buttons */}
                <div className="px-2 py-2 space-y-1">
                  <button className="
                    w-full flex items-center gap-2 px-2 py-2 rounded-lg
                    hover:bg-secondary/50
                    text-foreground/70 hover:text-foreground
                    transition-all duration-150
                  ">
                    <Bookmark className="w-4 h-4" />
                    <span className="text-sm">Save Tabs</span>
                  </button>

                  <button className="
                    w-full flex items-center gap-2 px-2 py-2 rounded-lg
                    hover:bg-secondary/50
                    text-foreground/70 hover:text-foreground
                    transition-all duration-150
                  ">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Notes Taker</span>
                  </button>
                </div>

                {/* User Profile */}
                <div className="px-2 py-2 border-t border-border/10">
                  <button
                    onClick={onProfileClick}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary/50 transition-all cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden border border-border/20">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Profile avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-foreground/70" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/80 truncate">
                        {userName}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </>
  );
};

export default Sidebar;
