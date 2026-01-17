import { useEffect, useRef, useState } from 'react';
import { usePerplexicaChat } from '@/contexts/PerplexicaChatContext';
import PerplexicaMessageBox from './PerplexicaMessageBox';
import EmptyChatInput from './EmptyChatInput';
import ChatInput from './ChatInput';

const PerplexicaChat = () => {
  const { messages, isLoading } = usePerplexicaChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inputWidth, setInputWidth] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track container width for fixed input positioning
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setInputWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateWidth);
      resizeObserver.disconnect();
    };
  }, [messages.length]);

  // Empty state - show centered input
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen max-w-screen-sm mx-auto p-4 space-y-4">
        <div className="flex flex-col items-center justify-center w-full space-y-8">
          <h2 className="text-foreground/70 text-3xl font-medium -mt-8">
            Research begins here.
          </h2>
          <EmptyChatInput />
        </div>
      </div>
    );
  }

  // Chat view with messages
  return (
    <div className="flex flex-col space-y-6 pt-8 pb-44 lg:pb-28 sm:mx-4 md:mx-8" ref={containerRef}>
      {messages.map((message, index) => {
        const isLast = index === messages.length - 1;
        return (
          <div key={message.id}>
            <PerplexicaMessageBox message={message} isLast={isLast} />
            {!isLast && (
              <div className="h-px w-full bg-border mt-6" />
            )}
          </div>
        );
      })}

      {/* Loading indicator */}
      {isLoading && messages.length > 0 && !messages[messages.length - 1]?.isStreaming && (
        <div className="flex items-center gap-2 text-foreground/50 text-sm">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '200ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '400ms' }} />
          </div>
          <span>Thinking...</span>
        </div>
      )}

      <div ref={messagesEndRef} className="h-0" />

      {/* Fixed input at bottom */}
      {inputWidth > 0 && (
        <div
          className="fixed z-40 bottom-24 lg:bottom-6"
          style={{ width: inputWidth }}
        >
          {/* Gradient fade effect */}
          <div
            className="pointer-events-none absolute -bottom-6 left-0 right-0 h-[calc(100%+48px)] dark:hidden"
            style={{
              background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background)) 35%, transparent 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-6 left-0 right-0 h-[calc(100%+48px)] hidden dark:block"
            style={{
              background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background)) 35%, transparent 100%)',
            }}
          />
          <ChatInput />
        </div>
      )}
    </div>
  );
};

export default PerplexicaChat;
