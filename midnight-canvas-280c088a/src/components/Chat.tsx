import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

interface ChatProps {
  messages: Message[];
  isLoading?: boolean;
}

const Chat = ({ messages, isLoading }: ChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`
              max-w-[80%] rounded-2xl px-4 py-3
              ${message.role === 'user'
                ? 'bg-primary/10 text-foreground'
                : 'bg-secondary/50 text-foreground/90'
              }
            `}
          >
            {message.isTyping ? (
              <div className="flex items-center gap-2">
                <span className="text-sm">{message.content}</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-secondary/50 rounded-2xl px-4 py-3">
            <Loader2 className="w-4 h-4 animate-spin text-foreground/50" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default Chat;
