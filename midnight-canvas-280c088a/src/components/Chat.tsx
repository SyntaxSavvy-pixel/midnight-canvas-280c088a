import { useEffect, useRef, useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

interface ChatProps {
  messages: Message[];
  isLoading?: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

const Chat = ({ messages, isLoading, onEditMessage }: ChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleEdit = (message: Message) => {
    setEditingId(message.id);
    setEditContent(message.content);
  };

  const handleSaveEdit = () => {
    if (editingId && onEditMessage && editContent.trim()) {
      onEditMessage(editingId, editContent.trim());
      setEditingId(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`
            group border-b border-border/5 py-6 px-4
            ${message.role === 'assistant' ? 'bg-secondary/20' : ''}
            hover:bg-secondary/30 transition-colors
          `}
        >
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gradient-to-br from-primary to-primary/60 text-white">
                {message.role === 'user' ? 'Y' : 'AI'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm">
                    {message.role === 'user' ? 'You' : 'GPT-5-nano'}
                  </span>
                </div>

                {editingId === message.id ? (
                  // Edit mode
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 text-xs bg-secondary text-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : message.isTyping ? (
                  // Thinking state
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse"></div>
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                ) : (
                  // Display mode
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {message.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="text-foreground/90 leading-relaxed mb-3">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-foreground/90">{children}</li>,
                          code: ({ children, className }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="px-1.5 py-0.5 rounded bg-secondary/50 text-primary text-sm font-mono">{children}</code>
                            ) : (
                              <code className={`block p-3 rounded-lg bg-secondary/50 text-sm font-mono overflow-x-auto ${className}`}>{children}</code>
                            );
                          },
                          pre: ({ children }) => <pre className="mb-3 rounded-lg overflow-hidden">{children}</pre>,
                          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                          h1: ({ children }) => <h1 className="text-xl font-semibold mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-semibold mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-semibold mb-2">{children}</h3>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-foreground whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                )}

                {/* Edit button (only for user messages) */}
                {message.role === 'user' && !editingId && !message.isTyping && (
                  <button
                    onClick={() => handleEdit(message)}
                    className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Loading state */}
      {isLoading && !messages.some(m => m.isTyping) && (
        <div className="bg-secondary/20 border-b border-border/5 py-6 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gradient-to-br from-primary to-primary/60 text-white">
                AI
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm mb-2">GPT-5-nano</div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default Chat;
