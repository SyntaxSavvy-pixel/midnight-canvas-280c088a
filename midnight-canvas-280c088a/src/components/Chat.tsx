import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
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

// Perplexity-style source pill with favicon and site name
const SourcePill = ({ source }: { source: Source }) => {
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const domain = getDomain(source.url);

  // Get short name from domain (e.g., "reddit.com" -> "Reddit")
  const getShortName = (domain: string) => {
    const name = domain.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#282828] border border-[#333] rounded-full text-xs transition-colors group"
      title={source.title}
    >
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
        alt=""
        className="w-3.5 h-3.5 rounded-sm"
      />
      <span className="text-[#999] group-hover:text-[#ccc] font-medium max-w-[100px] truncate">
        {getShortName(domain)}
      </span>
    </a>
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

                  {/* Perplexity-style sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      {message.sources.map((source, idx) => (
                        <SourcePill key={idx} source={source} />
                      ))}
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
