import { useEffect, useRef, useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface Source {
  title: string;
  url: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  sources?: Source[];
}

interface ChatProps {
  messages: Message[];
  isLoading?: boolean;
}

// Pill-style source link (like ChatGPT/Perplexity)
const SourcePill = ({ source, index }: { source: Source; index: number }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div className="relative inline-block">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#252525] hover:bg-[#303030] rounded-full text-xs text-cyan-400 transition-colors"
      >
        <span className="font-medium">{index + 1}</span>
      </a>

      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl z-50 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <img
              src={`https://www.google.com/s2/favicons?domain=${getDomain(source.url)}&sz=16`}
              alt=""
              className="w-4 h-4"
            />
            <span className="text-xs text-[#ccc] max-w-[200px] truncate">{source.title}</span>
            <ExternalLink className="w-3 h-3 text-[#666]" />
          </div>
          <div className="text-[10px] text-[#666] mt-1">{getDomain(source.url)}</div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[#333]" />
        </div>
      )}
    </div>
  );
};

const Chat = ({ messages, isLoading }: ChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {message.role === 'user' ? (
            <div className="bg-cyan-500/20 text-[#eee] px-4 py-2.5 rounded-2xl max-w-[70%]">
              <p className="text-sm">{message.content}</p>
            </div>
          ) : (
            <div className="w-full max-w-3xl">
              {message.isTyping ? (
                <div className="flex items-center gap-2 text-[#888]">
                  <span className="text-sm">{message.content}</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                </div>
              ) : (
                <>
                  {/* AI Response with markdown */}
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

                  {/* Sources as small pills at the bottom */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#222]">
                      <span className="text-[10px] text-[#555] uppercase tracking-wide">Sources</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {message.sources.map((source, idx) => (
                          <SourcePill key={idx} source={source} index={idx} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
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
