import { useEffect, useRef } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface Source {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  favicon: string;
}

export interface VideoResult {
  title: string;
  url: string;
  thumbnail: string | null;
  duration: string | null;
  publisher: string;
  isYouTube: boolean;
}

export interface ImageResult {
  title: string;
  url: string;
  thumbnail: string | null;
  source: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  sources?: Source[];
  videos?: VideoResult[];
  images?: ImageResult[];
}

interface ChatProps {
  messages: Message[];
  isLoading?: boolean;
}

// Compact source card
const SourceCard = ({ source, index }: { source: Source; index: number }) => (
  <a
    href={source.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] rounded-lg transition-colors border border-[#2a2a2a] group"
  >
    <img
      src={source.favicon}
      alt=""
      className="w-4 h-4 rounded shrink-0"
      onError={(e) => { e.currentTarget.src = 'https://www.google.com/favicon.ico'; }}
    />
    <span className="text-xs text-[#888] truncate max-w-[120px]">{source.title}</span>
    <span className="text-xs text-cyan-400 font-medium shrink-0">[{index + 1}]</span>
  </a>
);

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
          {message.role === 'user' ? (
            // User message - simple bubble
            <div className="bg-cyan-500/20 text-[#eee] px-4 py-2.5 rounded-2xl max-w-[70%]">
              <p className="text-sm">{message.content}</p>
            </div>
          ) : (
            // Assistant message - full width with markdown
            <div className="w-full max-w-3xl">
              {/* Message content FIRST */}
              <div className="mb-4">
                {message.isTyping ? (
                  <div className="flex items-center gap-2 text-[#aaa]">
                    <span className="text-sm">{message.content}</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="text-[#ccc] leading-relaxed mb-3 last:mb-0">{children}</p>,
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                            {children}
                          </a>
                        ),
                        strong: ({ children }) => <strong className="text-[#eee] font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="text-[#bbb]">{children}</em>,
                        code: ({ children }) => (
                          <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-cyan-300 text-xs">{children}</code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-[#1a1a1a] p-3 rounded-lg overflow-x-auto my-3 border border-[#2a2a2a]">{children}</pre>
                        ),
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-[#ccc] mb-3">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-[#ccc] mb-3">{children}</ol>,
                        li: ({ children }) => <li className="text-[#ccc]">{children}</li>,
                        h1: ({ children }) => <h1 className="text-xl font-bold text-[#eee] mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold text-[#eee] mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-bold text-[#eee] mb-2">{children}</h3>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-cyan-500 pl-3 text-[#999] italic my-3">{children}</blockquote>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Sources BELOW the response */}
              {message.sources && message.sources.length > 0 && !message.isTyping && (
                <div className="mt-4 pt-4 border-t border-[#222]">
                  <div className="flex items-center gap-2 mb-3">
                    <ExternalLink className="w-4 h-4 text-[#666]" />
                    <span className="text-xs text-[#666] font-medium">Sources</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {message.sources.slice(0, 6).map((source, idx) => (
                      <SourceCard key={idx} source={source} index={idx} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="flex items-center gap-2 text-[#666]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default Chat;
