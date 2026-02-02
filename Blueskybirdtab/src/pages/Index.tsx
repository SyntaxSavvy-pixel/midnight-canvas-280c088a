import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import SearchBar, { Attachment, SearchMode } from '@/components/SearchBar';
import { Search } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import LimitModal from '@/components/LimitModal';
import Chat, { Message, CodeBlock as ChatCodeBlock } from '@/components/Chat';
import PreviewSidebar from '@/components/PreviewSidebar';
import PlanModeInline, { PlanModeConfig } from '@/components/PlanModeInline';
import CommandHeader from '@/components/CommandHeader';
import WebView from '@/components/WebView';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useAIChat, CodeBlock } from '@/hooks/useAIChat';
import { useMemoryAnchors, MemoryAnchor } from '@/hooks/useMemoryAnchors';
import { usePinnedSites } from '@/hooks/usePinnedSites';
import { SearchHistoryItem } from '@/types/auth';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';

const ACTIVE_CHAT_KEY = 'tabkeep_active_chat_id';
const ACTIVE_ANCHOR_KEY = 'tabkeep_active_anchor_id';

const Index = () => {
  const { anchorId: urlAnchorId, chatId: urlChatId } = useParams();
  const navigate = useNavigate();
  // Consume context from ArcLayout
  const { sidebarOpen, setSidebarOpen, activeAnchor: layoutAnchor, isHeaderVisible } = useOutletContext<{
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
    activeAnchor: MemoryAnchor | undefined;
    isHeaderVisible: boolean;
    isIncognito: boolean;
  }>();

  const { isAuthenticated, profile, isLoading: authLoading } = useAuth();
  const {
    anchors,
    defaultAnchor,
    isLoading: anchorsLoading,
    getAnchorById,
    createAnchor,
  } = useMemoryAnchors();
  const {
    searchHistory,
    addSearch,
    updateSearch,
    deleteSearch,
    isLoading: historyLoading,
  } = useSearchHistory();

  // Preview sidebar state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCodeBlocks, setPreviewCodeBlocks] = useState<CodeBlock[]>([]);

  // AI Chat hook with code detection
  const { messages, isLoading, sendMessage, stopGeneration, clearMessages, setMessages, limitError, clearLimitError, currentCodeBlocks } = useAIChat({
    onCodeDetected: (blocks) => {
      setPreviewCodeBlocks(blocks);
      setPreviewOpen(true);
    },
  });

  // Auto-open preview sidebar
  useEffect(() => {
    if (currentCodeBlocks.length > 0) {
      setPreviewCodeBlocks(currentCodeBlocks);
      if (!previewOpen) {
        setPreviewOpen(true);
      }
    }
  }, [currentCodeBlocks, previewOpen]);

  const [showWelcome, setShowWelcome] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Web browsing state
  const [isWebMode, setIsWebMode] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const { pinnedSites, isLoading: pinnedLoading, togglePin, isPinned } = usePinnedSites(profile?.id);

  // Local activeAnchor state - synced with URL/Layout
  // We prioritize the layout's anchor which comes from URL
  const [activeAnchor, setActiveAnchor] = useState<MemoryAnchor | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Plan Mode state
  const [planModeActive, setPlanModeActive] = useState(false);
  const [planModeConfig, setPlanModeConfig] = useState<PlanModeConfig | null>(null);
  const [planModeAnswers, setPlanModeAnswers] = useState<Record<string, string>>({});
  const [planModeQuestionIndex, setPlanModeQuestionIndex] = useState(0);
  const [pendingPlanQuery, setPendingPlanQuery] = useState<string>('');
  const [isCheckingPlanMode, setIsCheckingPlanMode] = useState(false);

  const lastMessageCountRef = useRef(0);
  const hasRestoredRef = useRef(false);
  const hasAnchorRestoredRef = useRef(false);

  // Listen for navigation events from Sidebar/Layout
  useEffect(() => {
    const handleWebNav = (e: CustomEvent<{ url: string }>) => {
      const url = e.detail?.url;
      if (url) {
        let finalUrl = url;
        // Ensure protocol
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = `https://${finalUrl}`;
        }
        setCurrentUrl(finalUrl);
        setIsWebMode(true);
        setIsChatActive(true); // Hide "Welcome" state
      }
    };

    window.addEventListener('TABKEEP_NAVIGATE_WEB', handleWebNav as EventListener);
    return () => window.removeEventListener('TABKEEP_NAVIGATE_WEB', handleWebNav as EventListener);
  }, []);
  // Sync active anchor from Layout/URL or LocalStorage
  useEffect(() => {
    if (layoutAnchor) {
      setActiveAnchor(layoutAnchor);
      localStorage.setItem(ACTIVE_ANCHOR_KEY, layoutAnchor.anchor_id);
      hasAnchorRestoredRef.current = true;
      return;
    }

    // Fallback logic if layout doesn't provide it (e.g. root path)
    if (!isAuthenticated || anchorsLoading || anchors.length === 0) return;
    if (hasAnchorRestoredRef.current) return;

    const savedAnchorId = localStorage.getItem(ACTIVE_ANCHOR_KEY);
    let anchorToUse: MemoryAnchor | null = null;

    if (savedAnchorId) {
      anchorToUse = getAnchorById(savedAnchorId) || null;
    }

    if (!anchorToUse && defaultAnchor) {
      anchorToUse = defaultAnchor;
    }

    if (anchorToUse) {
      setActiveAnchor(anchorToUse);
      localStorage.setItem(ACTIVE_ANCHOR_KEY, anchorToUse.anchor_id);
    }
    hasAnchorRestoredRef.current = true;
  }, [layoutAnchor, isAuthenticated, anchorsLoading, anchors, defaultAnchor, getAnchorById]);


  // Handle URL-based chat routing
  useEffect(() => {
    if (!urlChatId || !activeAnchor || historyLoading) return;
    if (isLoading) return;
    if (activeChatId === urlChatId) return;

    const chat = searchHistory.find(c => c.id === urlChatId);
    if (chat) {
      if (chat.messages && Array.isArray(chat.messages) && chat.messages.length > 0) {
        setMessages(chat.messages as Message[]);
        lastMessageCountRef.current = chat.messages.length;
      }
      setActiveChatId(urlChatId);
      setIsChatActive(true);
    }
  }, [urlChatId, activeAnchor, searchHistory, historyLoading, setMessages, isLoading, activeChatId]);


  // Keyboard shortcuts (Sidebar managed by Layout, here just Preview)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + P to toggle preview
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        if (previewCodeBlocks.length > 0) {
          setPreviewOpen(prev => !prev);
        }
      }
      if (e.key === 'Escape') {
        if (previewOpen) {
          setPreviewOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewOpen, previewCodeBlocks.length]);

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

  // Persist active chat ID
  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
    } else {
      localStorage.removeItem(ACTIVE_CHAT_KEY);
    }
  }, [activeChatId]);

  // Auto-save messages
  useEffect(() => {
    if (activeChatId && messages.length > 0 && messages.length !== lastMessageCountRef.current) {
      const hasCompletedMessages = messages.every(m => !m.isTyping);
      if (hasCompletedMessages) {
        updateSearch({ id: activeChatId, messages });
        lastMessageCountRef.current = messages.length;
      }
    }
  }, [messages, activeChatId, updateSearch]);

  // UI Handlers
  const handleSearchFocus = useCallback(() => {
    // Don't hide the search bar on focus - keep it visible
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [sidebarOpen, setSidebarOpen]);

  const handleSearchBlur = () => {
    // Don't auto-hide the search bar on blur
    // This was causing it to disappear when users clicked to type
  };

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

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const checkPlanMode = async (query: string): Promise<PlanModeConfig | null> => {
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data.isPlanMode && data.questions && data.questions.length > 0) {
        return { questions: data.questions };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handlePlanModeAnswer = (questionId: string, answer: string) => {
    setPlanModeAnswers(prev => ({ ...prev, [questionId]: answer }));
    if (planModeConfig) {
      const nextIndex = planModeQuestionIndex + 1;
      if (nextIndex >= planModeConfig.questions.length) {
        completePlanMode({ ...planModeAnswers, [questionId]: answer });
      } else {
        setPlanModeQuestionIndex(nextIndex);
      }
    }
  };

  const completePlanMode = (finalAnswers?: Record<string, string>) => {
    const answers = finalAnswers || planModeAnswers;
    const answerSummary = Object.entries(answers)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    const enhancedQuery = answerSummary
      ? `${pendingPlanQuery}\n\nContext: ${answerSummary}`
      : pendingPlanQuery;
    setPlanModeActive(false);
    setPlanModeConfig(null);
    setPlanModeAnswers({});
    setPlanModeQuestionIndex(0);
    handleSearchWithQuery(enhancedQuery);
    setPendingPlanQuery('');
  };

  const handleSearchWithQuery = async (query: string, attachments?: Attachment[]) => {
    const currentAnchor = activeAnchor || defaultAnchor;
    if (!activeAnchor && defaultAnchor) {
      setActiveAnchor(defaultAnchor);
    }
    const isFirstMessage = !isChatActive;

    if (isFirstMessage) {
      setIsChatActive(true);
      if (currentAnchor) {
        navigate(`/tma/${currentAnchor.anchor_id}`, { replace: true });
      }
    }

    let attachmentInputs;
    if (attachments && attachments.length > 0) {
      attachmentInputs = await Promise.all(
        attachments.map(async (a) => ({
          type: a.type,
          dataUrl: await fileToDataUrl(a.file),
          frames: a.frames,
        }))
      );
    }

    sendMessage(
      query,
      profile?.id,
      activeChatId || undefined,
      attachmentInputs,
      currentAnchor?.anchor_id
    );

    if (isFirstMessage) {
      generateTitle(query).then(summarizedTitle => {
        if (isIncognito) return; // Don't save chat to history in incognito

        const newChatData = {
          title: summarizedTitle,
          initialQuery: query,
          messages: [{ id: Date.now().toString(), role: 'user', content: query }],
          anchorId: currentAnchor?.id,
        };
        addSearch(newChatData, {
          onSuccess: (data: any) => {
            if (data?.id) {
              setActiveChatId(data.id);
              lastMessageCountRef.current = 1;
              if (currentAnchor) {
                navigate(`/tma/${currentAnchor.anchor_id}/chat/${data.id}`, { replace: true });
              }
            }
          }
        });
      });
    }
  };

  const handleSearch = async (query: string, attachments?: Attachment[], mode: SearchMode = 'ai') => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    if (sidebarOpen) {
      setSidebarOpen(false);
    }

    // Web Search Mode - Use embedded browser
    if (mode === 'web') {
      let url = query.trim();

      // Check if it's a URL or search query
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.') && !url.includes(' ')) {
          // Looks like a domain
          url = `https://${url}`;
        } else {
          // Treat as Google search
          url = `https://www.google.com/search?q=${encodeURIComponent(url)}&igu=1`;
        }
      }

      setCurrentUrl(url);
      setIsWebMode(true);
      setIsChatActive(true);

      // Save to history as a Web Tab
      if (isAuthenticated && !isIncognito) {
        addSearch({
          title: url.replace(/^https?:\/\//, '').split('/')[0], // Use domain as title
          initialQuery: url,
          messages: [], // Empty messages = Web Tab
          anchorId: activeAnchor?.id
        });
      }
      return;
    }

    // AI Mode Logic
    if (!isChatActive) {
      setIsCheckingPlanMode(true);
      try {
        const planConfig = await checkPlanMode(query);
        if (planConfig) {
          setIsChatActive(true);
          setShowWelcome(false);
          setPlanModeConfig(planConfig);
          setPlanModeActive(true);
          setPlanModeAnswers({});
          setPlanModeQuestionIndex(0);
          setPendingPlanQuery(query);
          setIsCheckingPlanMode(false);
          return;
        }
      } catch (error) {
        console.error('Plan mode check failed:', error);
      } finally {
        setIsCheckingPlanMode(false);
      }
    }
    handleSearchWithQuery(query, attachments);
  };

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
  };

  const [isStandalone, setIsStandalone] = useState(false);

  // Detect PWA Standalone Mode
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsStandalone(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Loading state
  if (isRestoring || authLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If not authenticated
  if (!isAuthenticated) {
    // If running as standalone PWA (downloaded app), show dedicated Login Page
    if (isStandalone) {
      return (
        <LoginPage
          onSignInSuccess={handleAuthSuccess}
        />
      );
    }
    // If running in browser, show Marketing/Landing Page
    return (
      <>
        <LandingPage onSignIn={() => setAuthModalOpen(true)} />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen w-full overflow-hidden relative bg-[hsl(var(--background))] min-h-screen">
        {/* Unified Command Header */}
        {/* Unified Command Header */}
        {(isHeaderVisible ?? true) && (
          <CommandHeader
            url={currentUrl}
            onNavigate={(q) => handleSearch(q)}
            onRefresh={() => {
              if (isWebMode) setCurrentUrl(curr => curr.includes('?') ? curr + '&refresh=' + Date.now() : curr + '?refresh=' + Date.now());
            }}
            onBack={() => { /* TODO: History management */ }}
            onForward={() => { /* TODO: History management */ }}
            isLoading={isLoading}
            isWebMode={isWebMode}
          />
        )}

        {!isChatActive ? (
          <div className="flex flex-col items-center justify-center flex-1 w-full bg-[hsl(var(--background))] relative overflow-hidden min-h-screen">
            {/* Background Decoration - Enhanced */}
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/10 via-[hsl(var(--background))] to-blue-900/10 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/10 via-transparent to-transparent pointer-events-none" />

            <div className={`w-full max-w-xl flex flex-col items-center justify-center z-10 transition-all duration-700 ease-out p-6 ${showWelcome ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>

              {/* Logo / Greeting */}
              <div className="mb-8 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--theme-accent)] to-purple-600 flex items-center justify-center mb-6 shadow-2xl shadow-purple-500/20">
                  <span className="text-3xl">✨</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-medium text-[hsl(var(--text-primary))] text-center tracking-tight">
                  Where to?
                </h1>
              </div>

              {/* Fake Search Input (Triggers Header Focus) */}
              <div
                onClick={() => document.querySelector('input[type="text"]')?.focus()}
                className="w-full h-14 rounded-2xl bg-[hsl(var(--bg-surface))] hover:bg-[hsl(var(--bg-surface-hover))] border border-[hsl(var(--border-subtle))] flex items-center px-4 gap-3 cursor-text transition-all shadow-sm hover:shadow-md group mb-10"
              >
                 <Search className="w-5 h-5 text-[hsl(var(--text-secondary))] group-hover:text-[hsl(var(--theme-accent))] transition-colors" />
                 <span className="text-[hsl(var(--text-secondary))] text-lg">Search or ask anything...</span>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-4 gap-4 w-full">
                {['GitHub', 'Twitter', 'Gmail', 'YouTube'].map(site => (
                  <button
                    key={site}
                    onClick={() => handleSearch(site + '.com', [], 'web')}
                    className="
                         group relative aspect-[4/3] rounded-2xl bg-[hsl(var(--bg-surface))] hover:bg-[hsl(var(--bg-surface-hover))] 
                         border border-[hsl(var(--border-subtle))] flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
                    "
                  >
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--background))] group-hover:bg-white/10 flex items-center justify-center transition-colors">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${site.toLowerCase()}.com&sz=64`}
                        alt={site}
                        className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <span className="text-xs font-medium text-[hsl(var(--text-secondary))] group-hover:text-[hsl(var(--text-primary))] transition-colors">{site}</span>
                  </button>
                ))}
              </div>

              {/* Footer Quote or Hint */}
              <p className="mt-12 text-xs text-[hsl(var(--text-secondary))] opacity-50">
                Press <kbd className="font-sans px-1.5 py-0.5 rounded bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-subtle))]">/</kbd> to command
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Web View or AI Chat */}
            {isWebMode ? (
              <div className="flex-1 w-full h-full overflow-hidden border-t border-[hsl(var(--border-subtle))] bg-[hsl(var(--background))]">
                <WebView url={currentUrl} onUrlChange={setCurrentUrl} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pt-4 pb-28 px-4 w-full scrollbar-hide bg-[hsl(var(--background))]">
                <div className="max-w-3xl mx-auto w-full">
                  <Chat
                    messages={messages}
                    isLoading={isLoading}
                    onShowPreview={(blocks) => {
                      setPreviewCodeBlocks(blocks);
                      setPreviewOpen(true);
                    }}
                    onLivePreview={(blocks) => {
                      setPreviewCodeBlocks(blocks);
                      if (!previewOpen && blocks.length > 0) {
                        setPreviewOpen(true);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Plan Mode & Search Bar in Chat (Hidden in Web Mode) */}
        {isChatActive && !isWebMode && (
          <div className="absolute bottom-6 left-0 right-0 z-40 px-4">
            <div className="max-w-3xl mx-auto w-full space-y-4">
              <PlanModeInline
                isActive={planModeActive}
                config={planModeConfig}
                onAnswer={handlePlanModeAnswer}
                onComplete={completePlanMode}
                currentQuestionIndex={planModeQuestionIndex}
                answers={planModeAnswers}
              />

              <SearchBar
                onFocus={handleSearchFocus}
                onBlur={() => { }}
                onSearch={handleSearch}
                onStop={stopGeneration}
                placeholder={isCheckingPlanMode ? "Analyzing request..." : (planModeActive ? "Planning your request..." : "Ask anything")}
                disabled={planModeActive || isCheckingPlanMode}
                isGenerating={isLoading}
              />
            </div>
          </div>
        )}

        {/* Footer */}

      </div>

      <PreviewSidebar
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        codeBlocks={previewCodeBlocks}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <LimitModal
        isOpen={!!limitError}
        onClose={clearLimitError}
        limitType={limitError || 'daily'}
        plan={profile?.plan || 'free'}
      />
    </>
  );
};

export default Index;
