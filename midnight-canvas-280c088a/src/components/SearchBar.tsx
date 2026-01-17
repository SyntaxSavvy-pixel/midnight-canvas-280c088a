import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onFocus?: () => void;
  onBlur?: () => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
}

const SearchBar = ({ onFocus, onBlur, onSearch, placeholder = "Ask anything..." }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (query.trim()) {
      onSearch?.(query);
      setQuery(''); // Clear input after submission
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      inputRef.current?.blur();
      setQuery('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div
        className={`
          relative flex items-center w-full pl-6 pr-0 py-0
          bg-secondary/50 rounded-2xl
          border border-border/50
          transition-all duration-500 ease-out
          overflow-hidden
          ${isFocused 
            ? 'glow-border bg-secondary/70 scale-[1.02]' 
            : 'hover:bg-secondary/60 hover:border-border/70'
          }
        `}
        style={{
          boxShadow: isFocused 
            ? '0 0 60px -15px hsl(200 80% 60% / 0.3), inset 0 1px 1px hsl(0 0% 100% / 0.05)'
            : 'inset 0 2px 4px hsl(0 0% 0% / 0.2)',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="
            flex-1 bg-transparent py-4
            text-foreground text-lg font-light
            placeholder:text-muted-foreground/60
            focus:outline-none
            selection:bg-primary/30
          "
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="submit"
          className="
            h-full px-5 py-4
            bg-primary text-primary-foreground
            hover:bg-primary/90
            transition-all duration-200
            focus:outline-none
            rounded-r-xl
            flex items-center justify-center
          "
        >
          <Search className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
