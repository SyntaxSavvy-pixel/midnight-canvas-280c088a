import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, Mic, X as XIcon, ImagePlus, Sparkles, Square, Globe, Bot, Youtube, Search as SearchIcon, Twitter } from 'lucide-react';

export interface Attachment {
  type: 'image' | 'video';
  file: File;
  preview: string;
  frames?: string[];
}

export type SearchMode = 'ai' | 'web';

interface SearchBarProps {
  onFocus?: () => void;
  onBlur?: () => void;
  onSearch?: (query: string, attachments?: Attachment[], mode?: SearchMode) => void;
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isGenerating?: boolean;
  limitReached?: boolean;
  limitMessage?: string;
  onUpgrade?: () => void;
  initialMode?: SearchMode;
}

const SearchBar = ({
  onFocus,
  onBlur,
  onSearch,
  onStop,
  placeholder = "Ask anything",
  disabled = false,
  isGenerating = false,
  limitReached = false,
  limitMessage = "You've reached your limit. Upgrade to continue.",
  onUpgrade,
  initialMode = 'ai'
}: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [isFocused, setIsFocused] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 160);
      textarea.style.height = `${newHeight}px`;
    }
  }, [query]);

  // Handle focus
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

  // Drag and drop handlers (Only for AI Mode)
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === 'ai' && e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, [mode]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setIsDragging(false);
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (mode !== 'ai') return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0 && attachments.length < 4) {
      const newAttachments = imageFiles.slice(0, 4 - attachments.length).map(file => ({
        type: 'image' as const,
        file,
        preview: URL.createObjectURL(file)
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  }, [attachments.length, mode]);

  // File input handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length > 0 && attachments.length < 4) {
      const newAttachments = imageFiles.slice(0, 4 - attachments.length).map(file => ({
        type: 'image' as const,
        file,
        preview: URL.createObjectURL(file)
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsListening(!isListening);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((query.trim() || attachments.length > 0) && !limitReached && !disabled) {
      onSearch?.(query, mode === 'ai' && attachments.length > 0 ? attachments : undefined, mode);
      setQuery('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      textareaRef.current?.blur();
    }
  };

  const hasContent = query.trim().length > 0 || attachments.length > 0;
  const isDisabled = disabled || limitReached;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-3">

      {/* Search Mode Toggle */}
      <div className="flex justify-center">
        <div className="flex p-1 bg-[#141414] rounded-full border border-[#2a2a2a] shadow-lg">
          <button
            type="button"
            onClick={() => setMode('ai')}
            className={`
                    flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all
                    ${mode === 'ai'
                ? 'bg-[var(--theme-accent,theme(colors.blue.500))] text-white shadow-sm'
                : 'text-[#666] hover:text-[#bbb] hover:bg-[#ffffff05]'
              }
                `}
          >
            <Bot className="w-4 h-4" />
            <span>AI</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('web')}
            className={`
                    flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all
                    ${mode === 'web'
                ? 'bg-[var(--theme-accent,theme(colors.blue.500))] text-white shadow-sm'
                : 'text-[#666] hover:text-[#bbb] hover:bg-[#ffffff05]'
              }
                `}
          >
            <Globe className="w-4 h-4" />
            <span>Web</span>
          </button>
        </div>
      </div>

      {/* Main container */}
      <div
        ref={containerRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative
          bg-[#141414]
          rounded-2xl
          border
          shadow-lg shadow-black/20
          transition-all duration-300 ease-out
          overflow-hidden
          ${isDragging
            ? 'border-cyan-500/50 bg-cyan-500/5 scale-[1.01]'
            : isFocused
              ? 'border-[#333] shadow-xl shadow-black/30'
              : 'border-[#222] hover:border-[#2a2a2a]'
          }
          ${isDisabled ? 'opacity-60' : ''}
        `}
      >
        {/* Drag overlay (AI Mode only) */}
        {isDragging && mode === 'ai' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#141414]/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-cyan-400">
              <ImagePlus className="w-8 h-8" />
              <span className="text-sm font-medium">Drop images here</span>
            </div>
          </div>
        )}

        {/* Limit reached state */}
        {limitReached && (
          <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-200/90">{limitMessage}</span>
              </div>
              {onUpgrade && (
                <button
                  onClick={onUpgrade}
                  className="px-3 py-1 text-xs font-medium text-black bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors"
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>
        )}

        {/* Image attachments (AI Mode only) */}
        {mode === 'ai' && attachments.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="relative group animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#1a1a1a] ring-1 ring-white/10">
                    <img
                      src={attachment.preview}
                      alt="Attachment"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="
                      absolute -top-2 -right-2
                      w-6 h-6 rounded-full
                      bg-[#333] hover:bg-[#444]
                      border border-[#444]
                      flex items-center justify-center
                      opacity-0 group-hover:opacity-100
                      transition-all duration-150
                      hover:scale-110
                    "
                  >
                    <XIcon className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}

              {attachments.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="
                    w-20 h-20 rounded-xl
                    border-2 border-dashed border-[#333]
                    flex items-center justify-center
                    text-[#555] hover:text-[#888] hover:border-[#444]
                    transition-colors duration-150
                  "
                >
                  <ImagePlus className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Input area */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2 p-4">

          {/* AI Mode: Add Image Button */}
          {mode === 'ai' && attachments.length === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled}
              className={`
                p-2 rounded-xl
                text-[#666] hover:text-[#999]
                hover:bg-[#1f1f1f]
                transition-all duration-150
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title="Upload image"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
          )}

          {/* Web Mode: Search Icon */}
          {mode === 'web' && (
            <div className="p-2 text-[#555]">
              <SearchIcon className="w-5 h-5" />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder={mode === 'web' ? "Search Google, YouTube, X..." : placeholder}
              rows={1}
              disabled={isDisabled}
              className={`
                w-full
                bg-transparent
                resize-none
                text-[#f0f0f0] text-[15px] leading-relaxed
                placeholder:text-[#555]
                focus:outline-none
                min-h-[24px] max-h-[160px]
                py-1.5 px-1
                ${isDisabled ? 'cursor-not-allowed' : ''}
              `}
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">

            {/* AI Mode: Mic */}
            {mode === 'ai' && (
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={isDisabled}
                className={`
                    p-2 rounded-xl
                    transition-all duration-150
                    ${isListening
                    ? 'text-cyan-400 bg-cyan-400/10'
                    : 'text-[#666] hover:text-[#999] hover:bg-[#1f1f1f]'
                  }
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                title="Voice input"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}

            {/* Send / Stop button */}
            {isGenerating ? (
              <button
                type="button"
                onClick={onStop}
                className="
                  w-9 h-9 rounded-xl
                  flex items-center justify-center
                  transition-all duration-200
                  bg-white text-black hover:bg-gray-100 hover:scale-105 active:scale-95
                "
                title="Stop generating"
              >
                <Square className="w-4 h-4" fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!hasContent || isDisabled}
                className={`
                  w-9 h-9 rounded-xl
                  flex items-center justify-center
                  transition-all duration-200
                  ${hasContent && !isDisabled
                    ? 'bg-white text-black hover:bg-gray-100 hover:scale-105 active:scale-95'
                    : 'bg-[#252525] text-[#555] cursor-not-allowed'
                  }
                `}
                title={mode === 'web' ? "Search" : "Send message"}
              >
                <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </form>

        {/* Hints / Extra Info */}
        {!isFocused && !hasContent && !limitReached && mode === 'ai' && (
          <div className="px-4 pb-3 -mt-1 flex items-center gap-3">
            <span className="text-[10px] font-medium text-[#444] uppercase tracking-wider bg-[#1f1f1f] px-2 py-0.5 rounded">Chat</span>
            <span className="text-[10px] font-medium text-[#444] uppercase tracking-wider bg-[#1f1f1f] px-2 py-0.5 rounded">Code</span>
            <span className="text-[10px] font-medium text-[#444] uppercase tracking-wider bg-[#1f1f1f] px-2 py-0.5 rounded">Tasks</span>
          </div>
        )}

        {/* Web Mode Icons */}
        {!isFocused && !hasContent && !limitReached && mode === 'web' && (
          <div className="px-4 pb-3 -mt-1 flex items-center gap-3 opacity-60">
            <Youtube className="w-4 h-4 text-[#444]" />
            <SearchIcon className="w-4 h-4 text-[#444]" />
            <Twitter className="w-4 h-4 text-[#444]" />
          </div>
        )}

      </div>
    </div>
  );
};

export default SearchBar;
