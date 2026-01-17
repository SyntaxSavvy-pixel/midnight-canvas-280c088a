import { useState, useRef } from 'react';
import { ArrowUp, Sparkles, Globe, ImagePlus, Loader2 } from 'lucide-react';
import type { Platform } from '@/types/search';

export type SearchFocus = 'all' | 'web' | 'code' | 'video' | 'music' | 'discussions';

interface SearchBarProps {
  onFocus?: () => void;
  onBlur?: () => void;
  onSearch?: (query: string, focus?: SearchFocus) => void;
  placeholder?: string;
  isLoading?: boolean;
}

const SearchBar = ({
  onFocus,
  onBlur,
  onSearch,
  placeholder = "Message GPT-5-nano...",
  isLoading = false
}: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!query) {
      onBlur?.();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch?.(query, webSearchEnabled ? 'web' : 'all');
      setQuery('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      textareaRef.current?.blur();
      setQuery('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleImageUpload = () => {
    // TODO: Implement image upload
    console.log('Image upload clicked');
  };

  const hasQuery = query.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto relative">
      <div
        className={`
          relative flex items-end gap-2 w-full px-4 py-3
          bg-card/40 backdrop-blur-2xl
          rounded-2xl
          border border-border/30
          transition-all duration-300 ease-out
          shadow-lg shadow-black/5
          ${isFocused
            ? 'border-primary/40 shadow-xl shadow-primary/10 scale-[1.01]'
            : 'hover:border-border/50 hover:shadow-xl'
          }
        `}
      >
        {/* Shimmer effect on focus */}
        {isFocused && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl opacity-50"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.03), transparent)',
              animation: 'shimmer 3s infinite'
            }}
          />
        )}

        {/* Left side buttons */}
        <div className="flex items-center gap-1">
          {/* Upload Photo Button */}
          <button
            type="button"
            onClick={handleImageUpload}
            className="
              p-2 rounded-lg
              text-foreground/60 hover:text-foreground
              hover:bg-secondary/50
              transition-all duration-200
              group
            "
            title="Upload image"
          >
            <ImagePlus className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className="
              w-full bg-transparent py-2 px-2 resize-none
              text-foreground text-base
              placeholder:text-muted-foreground/50
              focus:outline-none
              selection:bg-primary/30
              disabled:opacity-50 disabled:cursor-not-allowed
              max-h-[200px]
              scrollbar-thin scrollbar-thumb-secondary/50 scrollbar-track-transparent
            "
            autoComplete="off"
            spellCheck="true"
            style={{
              minHeight: '24px',
              lineHeight: '24px'
            }}
          />
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          {/* Web Search Toggle - Perplexity style */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              className={`
                relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                text-xs font-medium
                transition-all duration-300 ease-out
                ${webSearchEnabled
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-secondary/30 text-foreground/50 border border-transparent hover:bg-secondary/50 hover:text-foreground/70'
                }
              `}
              title="Toggle web search"
            >
              <Globe className={`w-3.5 h-3.5 transition-transform duration-300 ${webSearchEnabled ? 'scale-110' : ''}`} />
              <span>Web</span>
              {webSearchEnabled && (
                <div className="absolute inset-0 rounded-lg bg-primary/10 animate-pulse" />
              )}
            </button>
          </div>

          {/* Send Button - ChatGPT/Lovable style */}
          <button
            type="submit"
            disabled={!hasQuery || isLoading}
            className={`
              relative p-2 rounded-lg
              flex items-center justify-center
              transition-all duration-200 ease-out
              ${hasQuery && !isLoading
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 shadow-md shadow-primary/20'
                : 'bg-secondary/30 text-foreground/30 cursor-not-allowed'
              }
              ${isLoading ? 'animate-pulse' : ''}
            `}
          >
            {isLoading ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <ArrowUp className={`w-4.5 h-4.5 transition-transform duration-200 ${hasQuery ? 'scale-100' : 'scale-90'}`} />
            )}

            {/* Glow effect on hover */}
            {hasQuery && !isLoading && (
              <div className="absolute inset-0 rounded-lg bg-primary/20 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-200" />
            )}
          </button>
        </div>
      </div>

      {/* Helper text */}
      {isFocused && (
        <div className="mt-2 px-4 text-xs text-muted-foreground/50 text-center animate-in fade-in duration-300">
          Press <kbd className="px-1.5 py-0.5 rounded bg-secondary/50 font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-secondary/50 font-mono">Shift+Enter</kbd> for new line
        </div>
      )}

      {/* Add keyframes to global styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />
    </form>
  );
};

export default SearchBar;
