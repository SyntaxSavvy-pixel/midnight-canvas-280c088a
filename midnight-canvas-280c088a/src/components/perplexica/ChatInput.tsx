import { useRef, useState, useEffect } from 'react';
import { ArrowUp, Paperclip } from 'lucide-react';
import { usePerplexicaChat } from '@/contexts/PerplexicaChatContext';
import { cn } from '@/lib/utils';

const ChatInput = () => {
  const { sendMessage, isLoading } = usePerplexicaChat();
  const [message, setMessage] = useState('');
  const [rows, setRows] = useState(1);
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Update mode based on textarea content
  useEffect(() => {
    if (rows >= 2 && message && mode === 'single') {
      setMode('multi');
    } else if (!message && mode === 'multi') {
      setMode('single');
    }
  }, [rows, mode, message]);

  // Keyboard shortcut to focus input
  useEffect(() => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      sendMessage(message.trim());
      setMessage('');
      setRows(1);
      setMode('single');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Calculate rows based on content
    const lineCount = e.target.value.split('\n').length;
    setRows(Math.min(lineCount, 4));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative bg-card p-4 flex items-center overflow-visible border border-border shadow-sm transition-all duration-200 focus-within:border-primary/50',
        mode === 'multi' ? 'flex-col rounded-2xl' : 'flex-row rounded-full'
      )}
    >
      {mode === 'single' && (
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-secondary transition-colors mr-1"
          title="Attach file"
        >
          <Paperclip size={18} className="text-foreground/50" />
        </button>
      )}

      <textarea
        ref={inputRef}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        className="transition bg-transparent placeholder:text-foreground/50 placeholder:text-sm text-sm text-foreground resize-none focus:outline-none w-full px-2 max-h-24 lg:max-h-36 xl:max-h-48 flex-grow flex-shrink"
        placeholder="Ask a follow-up"
      />

      {mode === 'single' && (
        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className="bg-primary text-white disabled:text-foreground/50 disabled:bg-secondary hover:bg-primary/90 transition duration-100 rounded-full p-2 ml-1"
        >
          <ArrowUp size={17} />
        </button>
      )}

      {mode === 'multi' && (
        <div className="flex flex-row items-center justify-between w-full pt-2">
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            title="Attach file"
          >
            <Paperclip size={18} className="text-foreground/50" />
          </button>
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="bg-primary text-white disabled:text-foreground/50 disabled:bg-secondary hover:bg-primary/90 transition duration-100 rounded-full p-2"
          >
            <ArrowUp size={17} />
          </button>
        </div>
      )}
    </form>
  );
};

export default ChatInput;
