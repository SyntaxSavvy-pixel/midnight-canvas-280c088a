import { useState, useEffect, useRef, useCallback } from 'react';
import SearchBar from '@/components/SearchBar';
import Sidebar from '@/components/Sidebar';
import SignUpButton from '@/components/SignUpButton';
import AuthModal from '@/components/AuthModal';
import UserSettingsModal from '@/components/UserSettingsModal';
import Chat, { Message } from '@/components/Chat';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useAIChat } from '@/hooks/useAIChat';
import { SearchHistoryItem } from '@/types/auth';

const ACTIVE_CHAT_KEY = 'tabkeep_active_chat_id';

const Index = () => {
  const { isAuthenticated, profile, isLoading: authLoading } = useAuth();
  const {
    searchHistory,
    addSearch,
    updateSearch,
    deleteSearch,
    isLoading: historyLoading,
  } = useSearchHistory();

  // AI Chat hook (OpenAI + Brave Search)
  const { messages, isLoading, sendMessage, clearMessages, setMessages } = useAIChat();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  
  // Track if we need to save the current conversation
  const lastMessageCountRef = useRef(0);
  const hasRestoredRef = useRef(false);

  // Restore active chat on page load
  useEffect(() => {
    if (hasRestoredRef.current || historyLoading || !isAuthenticated) {
      if (!isAuthenticated && !authLoading) {
        setIsRestoring(false);
      }
      return;
    }

    const savedChatId = localStorage.getItem(ACTIVE_CHAT_KEY);
    
    if (savedChatId && searchHistory.length > 0) {
      const savedChat = searchHistory.find(chat => chat.id === savedChatId);
      
      if (savedChat) {
        // Restore the chat
        if (savedChat.messages && Array.isArray(savedChat.messages) && savedChat.messages.length > 0) {
          setMessages(savedChat.messages as Message[]);
          lastMessageCountRef.current = savedChat.messages.length;
        } else {
          const initialMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: savedChat.initial_query
          };
          setMessages([initialMessage]);
          lastMessageCountRef.current = 1;
        }
        
        setActiveChatId(savedChatId);
        setIsChatActive(true);
      }
    }
    
    hasRestoredRef.current = true;
    setIsRestoring(false);
  }, [searchHistory, historyLoading, isAuthenticated, authLoading, setMessages]);

  // Persist active chat ID to localStorage
  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
    } else {
      localStorage.removeItem(ACTIVE_CHAT_KEY);
    }
  }, [activeChatId]);

  // Auto-save messages when they change (after initial load)
  useEffect(() => {
    if (activeChatId && messages.length > 0 && messages.length !== lastMessageCountRef.current) {
      // Only save if messages actually changed and chat is not loading
      const hasCompletedMessages = messages.every(m => !m.isTyping);
      if (hasCompletedMessages) {
        updateSearch({ id: activeChatId, messages });
        lastMessageCountRef.current = messages.length;
      }
    }
  }, [messages, activeChatId, updateSearch]);

  // Close sidebar when search bar is focused
  const handleSearchFocus = useCallback(() => {
    setShowWelcome(false);
    // Close sidebar when user focuses on search
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [sidebarOpen]);

  const handleSearchBlur = () => {
    setTimeout(() => {
      setShowWelcome(true);
    }, 300);
  };

  // Generate a summarized title for the chat
  const generateTitle = async (message: string): Promise<string> => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/generate-title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      return data.title || message.slice(0, 30);
    } catch {
      return message.slice(0, 30);
    }
  };

  const handleSearch = async (query: string) => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    // Close sidebar when sending a message
    if (sidebarOpen) {
      setSidebarOpen(false);
    }

    if (!isChatActive) {
      setIsChatActive(true);

      // Generate a summarized title using AI
      const summarizedTitle = await generateTitle(query);

      // Create new chat and save to history with summarized title
      const newChatData = {
        title: summarizedTitle,
        initialQuery: query,
        messages: [{ id: Date.now().toString(), role: 'user', content: query }],
      };

      // Use mutateAsync to get the created record
      addSearch(newChatData, {
        onSuccess: (data: any) => {
          if (data?.id) {
            setActiveChatId(data.id);
            lastMessageCountRef.current = 1;
          }
        }
      });
    }

    // Send message to AI (with streaming)
    await sendMessage(query);
  };

  const handleSignUpClick = () => {
    if (isAuthenticated) {
      // Toggle sidebar when clicking profile
      setSidebarOpen(prev => !prev);
      return;
    }
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
  };

  const handleRenameChat = (id: string, newTitle: string) => {
    updateSearch({ id, title: newTitle });
  };

  const handleDeleteChat = (id: string) => {
    deleteSearch(id);
    // If we deleted the active chat, reset to welcome screen
    if (id === activeChatId) {
      setIsChatActive(false);
      setActiveChatId(null);
      clearMessages();
    }
  };

  const handleSelectChat = (item: SearchHistoryItem) => {
    // Close sidebar when selecting a chat
    setSidebarOpen(false);
    
    // Load the saved conversation
    if (item.messages && Array.isArray(item.messages) && item.messages.length > 0) {
      setMessages(item.messages as Message[]);
      lastMessageCountRef.current = item.messages.length;
    } else {
      // If no saved messages, create initial message from query
      const initialMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: item.initial_query
      };
      setMessages([initialMessage]);
      lastMessageCountRef.current = 1;
    }
    
    setActiveChatId(item.id);
    setIsChatActive(true);
  };

  const handleNewChat = () => {
    // Close sidebar when starting new chat
    setSidebarOpen(false);
    
    // Clear current chat and go back to welcome screen
    clearMessages();
    setActiveChatId(null);
    setIsChatActive(false);
    lastMessageCountRef.current = 0;
  };

  // Show loading state while restoring
  if (isRestoring && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - in its own lane, never overlaps */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
        history={searchHistory}
        userName={profile?.display_name || profile?.email?.split('@')[0] || 'User'}
        userEmail={profile?.email || ''}
        avatarUrl={profile?.avatar_url}
        subscriptionPlan="Free"
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onProfileClick={() => setSettingsModalOpen(true)}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onLogout={() => {/* TODO: Implement logout */}}
        activeChatId={activeChatId}
      />

      {/* Main content area - takes remaining space */}
      <div className="flex-1 relative min-h-screen overflow-hidden">
        {/* Ambient glow effects */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 50%, hsl(200 80% 60% / 0.03) 0%, transparent 60%)',
          }}
        />

        {/* Top navigation */}
        <header className="absolute top-0 right-0 left-0 z-30 p-6">
          <div className="flex items-center justify-end gap-3 max-w-7xl mx-auto transition-all duration-300">
            <div
              className={`
                ${sidebarOpen ? 'dust-dissolve-out pointer-events-none' : 'dust-dissolve-in'}
              `}
            >
              <ThemeToggle />
            </div>
            <div
              className={`
                ${sidebarOpen ? 'dust-dissolve-out pointer-events-none' : 'dust-dissolve-in'}
              `}
            >
              <SignUpButton onClick={handleSignUpClick} isAuthenticated={isAuthenticated} avatarUrl={profile?.avatar_url} />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="relative z-10 flex flex-col min-h-screen">
          {!isChatActive ? (
            // Welcome screen
            <div className="flex flex-col items-center justify-center flex-1 px-6">
              {/* Brand name - hidden when sidebar is open */}
              <div
                className={`
                  mb-8 transition-all duration-500 ease-out
                  ${sidebarOpen ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}
                `}
              >
                <span className="text-2xl font-medium text-foreground tracking-tight">
                  TabKeep<span className="text-primary">.app</span>
                </span>
              </div>

              {/* Welcome text */}
              <div
                className={`
                  mb-16 text-center transition-all duration-700 ease-out
                  ${showWelcome
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-8 pointer-events-none'
                  }
                `}
              >
                <h1 className="text-5xl md:text-6xl font-light text-foreground tracking-tight mb-4">
                  What would you like to know?
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Search across social media platforms
                </p>
              </div>

              {/* Search bar */}
              <div
                className={`
                  w-full flex justify-center
                  transition-all duration-700 ease-out
                  ${showWelcome ? 'translate-y-0' : '-translate-y-20'}
                `}
              >
                <SearchBar
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  onSearch={handleSearch}
                />
              </div>

              {/* Subtle hint text */}
              <p
                className={`
                  mt-8 text-sm text-muted-foreground/50 font-light
                  transition-all duration-500 delay-200
                  ${showWelcome ? 'opacity-100' : 'opacity-0'}
                `}
              >
                Press Enter to search • Esc to clear
              </p>
            </div>
          ) : (
            // Chat interface
            <>
              <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full pt-20">
                {/* AI is always configured via API server */}

                <Chat messages={messages} isLoading={isLoading} />
              </div>

              {/* Fixed search bar at bottom */}
              <div className="sticky bottom-0 border-t border-border/10 bg-background/80 backdrop-blur-xl p-4">
                <div className="max-w-4xl mx-auto">
                  <SearchBar
                    onFocus={handleSearchFocus}
                    onBlur={() => {}}
                    onSearch={handleSearch}
                    placeholder={isLoading ? "Please wait..." : "Type your message..."}
                  />
                </div>
              </div>
            </>
          )}
        </main>

        {/* Copyright footer - hidden when sidebar is expanded or chat is active */}
        <footer
          className={`
            absolute bottom-6 left-0 right-0 z-20 text-center
            transition-all duration-500 ease-out
            ${sidebarOpen || isChatActive ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}
          `}
        >
          <p className="text-xs text-muted-foreground/40 font-light">
            © 2026 TabKeep.app
          </p>
        </footer>

        {/* Bottom gradient fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, hsl(230 15% 5%) 0%, transparent 100%)',
          }}
        />
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* User Settings Modal */}
      <UserSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
};

export default Index;
