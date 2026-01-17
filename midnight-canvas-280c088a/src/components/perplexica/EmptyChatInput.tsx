import { useRef, useState, useEffect, useCallback } from 'react';
import {
  ArrowRight, Paperclip, Zap, Scale, Sparkles, Search, Globe, FileText,
  GraduationCap, Newspaper, MessageSquare, Image, Video, X, File,
  Link, Clock
} from 'lucide-react';
import { usePerplexicaChat, SourceFocus } from '@/contexts/PerplexicaChatContext';
import { cn } from '@/lib/utils';

// TabKeep Logo Component
const TabKeepLogo = ({ size = 48 }: { size?: number }) => (
  <div className="relative" style={{ width: size, height: size }}>
    <svg viewBox="0 0 375 375" width={size} height={size}>
      <text x="95" y="250" fontSize="200" fontWeight="700" fill="#f93d3a" fontFamily="Inter, sans-serif">T</text>
      <text x="195" y="250" fontSize="200" fontWeight="700" fill="#31a768" fontFamily="Inter, sans-serif">A</text>
      <circle cx="230" cy="95" r="8" fill="#f6d636" />
    </svg>
  </div>
);

const EmptyChatInput = () => {
  const {
    sendMessage,
    optimizationMode,
    setOptimizationMode,
    sourceFocus,
    setSourceFocus,
    domainFilter,
    setDomainFilter,
    files,
    uploadFiles,
    removeFile,
    searchHistory,
    suggestions,
    getSuggestions,
  } = usePerplexicaChat();

  const [message, setMessage] = useState('');
  const [showDomainInput, setShowDomainInput] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Auto-focus and keyboard shortcut
  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable');

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced suggestions
  const handleInputChange = useCallback((value: string) => {
    setMessage(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (value.length >= 2) {
        getSuggestions(value);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }, 300);
  }, [getSuggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage(message.trim());
      setMessage('');
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const modes = [
    { id: 'speed', icon: Zap, label: 'Speed', description: 'Fast answers', color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { id: 'balanced', icon: Scale, label: 'Balanced', description: 'Best results', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { id: 'quality', icon: Sparkles, label: 'Quality', description: 'Deep research', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  ] as const;

  const sourceFocusOptions: { id: SourceFocus; icon: any; label: string }[] = [
    { id: 'all', icon: Globe, label: 'All' },
    { id: 'web', icon: Search, label: 'Web' },
    { id: 'academic', icon: GraduationCap, label: 'Academic' },
    { id: 'news', icon: Newspaper, label: 'News' },
    { id: 'discussions', icon: MessageSquare, label: 'Discussions' },
    { id: 'images', icon: Image, label: 'Images' },
    { id: 'videos', icon: Video, label: 'Videos' },
  ];

  const quickSuggestions = [
    { icon: Globe, text: "What's happening in tech today?", category: 'News' },
    { icon: GraduationCap, text: 'Explain quantum computing simply', category: 'Learn' },
    { icon: FileText, text: 'Summarize the latest AI research', category: 'Research' },
    { icon: Search, text: 'Compare React vs Vue vs Angular', category: 'Compare' },
  ];

  const handleSuggestionClick = (text: string) => {
    sendMessage(text);
    setShowSuggestions(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Logo and welcome */}
      <div className="flex flex-col items-center mb-8">
        <TabKeepLogo size={64} />
        <h1 className="mt-4 text-2xl font-semibold text-foreground">
          What do you want to know?
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          AI-powered search with real-time web results
        </p>
      </div>

      {/* Source Focus Selector */}
      <div className="flex items-center justify-center gap-1 mb-4 flex-wrap">
        {sourceFocusOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setSourceFocus(option.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              sourceFocus === option.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            <option.icon size={14} />
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="w-full relative">
        <div className="flex flex-col bg-card px-4 pt-4 pb-3 rounded-2xl w-full border border-border shadow-lg transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-xl focus-within:shadow-primary/5">
          {/* Uploaded files */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-border/50">
              {files.map((file) => (
                <div
                  key={file.fileId}
                  className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-xs"
                >
                  <File size={14} className="text-muted-foreground" />
                  <span className="text-foreground max-w-[150px] truncate">{file.fileName}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.fileId)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Domain filter input */}
          {showDomainInput && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
              <Link size={14} className="text-muted-foreground" />
              <input
                type="text"
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                placeholder="site:example.com (limit search to specific domain)"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setDomainFilter('');
                  setShowDomainInput(false);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => message.length >= 2 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            rows={2}
            className="px-1 bg-transparent placeholder:text-[15px] placeholder:text-foreground/40 text-sm text-foreground resize-none focus:outline-none w-full max-h-24 lg:max-h-36 xl:max-h-48"
            placeholder="Ask anything..."
          />

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-secondary transition-colors"
                >
                  <Search size={14} className="text-muted-foreground" />
                  <span className="text-foreground">{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-row items-center justify-between mt-3 pt-3 border-t border-border/50">
            {/* Optimization mode selector */}
            <div className="flex items-center gap-1">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setOptimizationMode(mode.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    optimizationMode === mode.id
                      ? `${mode.bgColor} ${mode.color} border-current/20`
                      : 'border-transparent hover:bg-secondary text-muted-foreground'
                  )}
                >
                  <mode.icon size={14} />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              ))}
            </div>

            {/* Right side actions */}
            <div className="flex flex-row items-center gap-1">
              {/* Domain filter toggle */}
              <button
                type="button"
                onClick={() => setShowDomainInput(!showDomainInput)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  showDomainInput || domainFilter
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-secondary text-muted-foreground'
                )}
                title="Search specific domain"
              >
                <Link size={18} />
              </button>

              {/* File upload */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.doc,.docx,.md,.csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                title="Upload files"
              >
                <Paperclip size={18} />
              </button>

              <button
                type="submit"
                disabled={!message.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition duration-100 rounded-xl px-4 py-2 font-medium text-sm"
              >
                <span className="hidden sm:inline">Search</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Mode & Source description */}
      <div className="mt-3 text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          {optimizationMode === 'speed' && 'Speed Mode: Quick answers using GPT-4o-mini'}
          {optimizationMode === 'balanced' && 'Balanced Mode: Best mix of speed and accuracy'}
          {optimizationMode === 'quality' && 'Quality Mode: Deep research using GPT-4o'}
        </p>
        {domainFilter && (
          <p className="text-xs text-primary">
            Searching only: {domainFilter}
          </p>
        )}
      </div>

      {/* Quick Suggestions */}
      <div className="mt-8">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 text-center">
          Try asking
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {quickSuggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(suggestion.text)}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all text-left group"
            >
              <div className="p-2 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                <suggestion.icon size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground line-clamp-1">{suggestion.text}</p>
                <p className="text-xs text-muted-foreground">{suggestion.category}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent searches */}
      {searchHistory.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 text-center">
            Recent Searches
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {searchHistory.slice(0, 5).map((entry) => (
              <button
                key={entry.id}
                onClick={() => handleSuggestionClick(entry.query)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              >
                <Clock size={12} />
                <span className="max-w-[150px] truncate">{entry.query}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <p className="text-center text-xs text-muted-foreground/60 mt-6">
        Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-muted-foreground font-mono text-[10px]">/</kbd> to focus
      </p>
    </div>
  );
};

export default EmptyChatInput;
