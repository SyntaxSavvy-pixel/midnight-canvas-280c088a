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
  ChevronUp,
  Crown
} from 'lucide-react';
import { SearchHistoryItem } from '@/types/auth';

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
  userName = "User",
  userEmail = "user@example.com",
  avatarUrl,
  subscriptionPlan = "Free",
  onProfileClick,
  onNewChat,
  onLogout,
}: SidebarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [activeNav, setActiveNav] = useState<NavItem>('ask');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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
      }, 400);
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

  const handleNavClick = (item: NavItem) => {
    setActiveNav(item);
    if (item === 'ask' && onNewChat) {
      onNewChat();
    }
  };

  const navItems = [
    { id: 'ask' as NavItem, label: 'Ask', icon: MessageSquare, description: 'Search & Chat' },
    { id: 'save-tabs' as NavItem, label: 'Save Tabs', icon: Bookmark, description: 'Manage saved tabs' },
    { id: 'community' as NavItem, label: 'Community', icon: Users, description: 'Join the community' },
  ];

  return (
    <>
      {/* Toggle button - always visible, positioned in sidebar lane */}
      <div
        className={`
          shrink-0 transition-all duration-500 ease-out
          ${isOpen ? 'w-72' : 'w-14'}
        `}
      >
        {/* Collapsed state - just the toggle button */}
        {!isOpen && !isVisible && (
          <div className="h-screen p-2">
            <button
              onClick={onToggle}
              className="
                p-2.5 rounded-2xl
                bg-card/40 backdrop-blur-xl
                border border-white/10
                hover:bg-white/10 hover:border-white/20
                transition-all duration-300
                shadow-lg shadow-black/20
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
              transition-all duration-400 ease-out
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
              bg-gradient-to-b from-white/[0.08] to-white/[0.03]
              backdrop-blur-2xl
              border border-white/10
              rounded-3xl
              overflow-hidden
              shadow-2xl shadow-black/30
            ">
              {/* Header with close button */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <span className="text-lg font-semibold text-foreground/90">TabKeep</span>
                <button
                  onClick={onToggle}
                  className="
                    p-2 rounded-xl
                    hover:bg-white/10
                    transition-all duration-200
                  "
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5 text-foreground/60" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-2xl
                        transition-all duration-300 ease-out
                        group relative overflow-hidden
                        ${isActive
                          ? 'bg-white/15 shadow-lg shadow-primary/10'
                          : 'hover:bg-white/8'
                        }
                      `}
                    >
                      {/* Active indicator glow */}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl" />
                      )}

                      <div className={`
                        p-2 rounded-xl transition-all duration-300
                        ${isActive
                          ? 'bg-primary/20 text-primary'
                          : 'bg-white/5 text-foreground/60 group-hover:bg-white/10 group-hover:text-foreground/80'
                        }
                      `}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 text-left relative z-10">
                        <p className={`
                          text-sm font-medium transition-colors duration-200
                          ${isActive ? 'text-foreground' : 'text-foreground/70 group-hover:text-foreground/90'}
                        `}>
                          {item.label}
                        </p>
                        <p className="text-xs text-foreground/40 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Bottom Profile Section */}
              <div className="p-3 relative" ref={profileMenuRef}>
                {/* Profile Dropdown Menu */}
                {profileMenuOpen && (
                  <div
                    className="
                      absolute bottom-full left-3 right-3 mb-2
                      bg-gradient-to-b from-white/[0.12] to-white/[0.06]
                      backdrop-blur-2xl
                      border border-white/15
                      rounded-2xl
                      shadow-2xl shadow-black/40
                      overflow-hidden
                      animate-in slide-in-from-bottom-2 fade-in duration-200
                    "
                  >
                    {/* User Info Header */}
                    <div className="px-4 py-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden border border-white/20">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {userName}
                          </p>
                          <p className="text-xs text-foreground/50 truncate">
                            {userEmail}
                          </p>
                        </div>
                      </div>

                      {/* Subscription Badge */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium
                          flex items-center gap-1.5
                          ${subscriptionPlan === 'Pro'
                            ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-white/10 text-foreground/60 border border-white/10'
                          }
                        `}>
                          {subscriptionPlan === 'Pro' && <Crown className="w-3.5 h-3.5" />}
                          {subscriptionPlan} Plan
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {/* Memory */}
                      <button className="
                        w-full flex items-center gap-3 px-4 py-2.5
                        hover:bg-white/8 transition-colors duration-200
                        text-foreground/70 hover:text-foreground
                      ">
                        <Brain className="w-4 h-4" />
                        <span className="text-sm">Memory</span>
                        <span className="ml-auto text-xs text-foreground/40">Beta</span>
                      </button>

                      {/* Settings */}
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onProfileClick?.();
                        }}
                        className="
                          w-full flex items-center gap-3 px-4 py-2.5
                          hover:bg-white/8 transition-colors duration-200
                          text-foreground/70 hover:text-foreground
                        "
                      >
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">Settings</span>
                      </button>

                      {/* Help */}
                      <button className="
                        w-full flex items-center gap-3 px-4 py-2.5
                        hover:bg-white/8 transition-colors duration-200
                        text-foreground/70 hover:text-foreground
                      ">
                        <HelpCircle className="w-4 h-4" />
                        <span className="text-sm">Help & FAQ</span>
                      </button>

                      <div className="my-2 mx-4 border-t border-white/10" />

                      {/* Upgrade Plan */}
                      <button className="
                        w-full flex items-center gap-3 px-4 py-2.5
                        hover:bg-white/8 transition-colors duration-200
                        text-primary hover:text-primary
                      ">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-medium">Upgrade Plan</span>
                      </button>

                      <div className="my-2 mx-4 border-t border-white/10" />

                      {/* Logout */}
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onLogout?.();
                        }}
                        className="
                          w-full flex items-center gap-3 px-4 py-2.5
                          hover:bg-red-500/10 transition-colors duration-200
                          text-foreground/70 hover:text-red-400
                        "
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Log out</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Profile Button */}
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-2xl
                    transition-all duration-300
                    ${profileMenuOpen
                      ? 'bg-white/15 shadow-lg'
                      : 'hover:bg-white/8'
                    }
                  `}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden border border-white/20 shadow-lg">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>

                  {/* Name & Plan */}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground/90 truncate">
                      {userName}
                    </p>
                    <p className="text-xs text-foreground/50">
                      {subscriptionPlan} Plan
                    </p>
                  </div>

                  {/* Chevron */}
                  <ChevronUp className={`
                    w-4 h-4 text-foreground/40
                    transition-transform duration-300
                    ${profileMenuOpen ? 'rotate-180' : ''}
                  `} />
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
