import { useEffect, useRef, useState, useMemo } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check, Eye, Play, Code2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface MessageAttachment {
  type: 'image' | 'video';
  dataUrl: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  attachments?: MessageAttachment[];
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

interface ChatProps {
  messages: Message[];
  isLoading?: boolean;
  onShowPreview?: (codeBlocks: CodeBlock[]) => void;
  onLivePreview?: (blocks: CodeBlock[]) => void;
}

// Parse code blocks from content
function parseCodeBlocks(content: string): CodeBlock[] {
  const codeBlockRegex = /```(\w+)?(?:\s+(\S+))?\n([\s\S]*?)```/g;
  const blocks: CodeBlock[] = [];

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const [, language = 'text', filename, code] = match;
    blocks.push({
      language: language.toLowerCase(),
      code: code.trim(),
      filename: filename || undefined,
    });
  }

  return blocks;
}

// Check if content has previewable code blocks
function hasPreviewableCode(content: string): boolean {
  const previewable = ['html', 'htm', 'jsx', 'tsx', 'react', 'javascript', 'js', 'css'];
  const blocks = parseCodeBlocks(content);
  return blocks.some(b => previewable.includes(b.language));
}

// Get previewable code blocks
function getPreviewableBlocks(content: string): CodeBlock[] {
  const previewable = ['html', 'htm', 'jsx', 'tsx', 'react', 'javascript', 'js', 'css'];
  const blocks = parseCodeBlocks(content);
  return blocks.filter(b => previewable.includes(b.language));
}

// Custom branded thinking indicator - unique waveform design
const ThinkingIndicator = () => {
  const [thinkingText, setThinkingText] = useState('Processing');

  useEffect(() => {
    const texts = ['Processing', 'Generating', 'Composing'];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % texts.length;
      setThinkingText(texts[index]);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="py-4 px-1 animate-fade-in">
      {/* Intelligence waveform visualization */}
      <div className="flex items-center gap-3 mb-3">
        {/* Animated waveform bars */}
        <div className="flex items-end gap-[3px] h-5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-[3px] bg-gradient-to-t from-cyan-500/40 to-cyan-400/80 rounded-full"
              style={{
                animation: 'waveform 1s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
                height: '100%',
              }}
            />
          ))}
        </div>

        {/* Status text with soft glow */}
        <span className="text-sm font-medium text-[#888] tracking-wide">
          {thinkingText}
          <span className="inline-flex ml-1">
            <span className="animate-pulse">.</span>
            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
            <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
          </span>
        </span>
      </div>

      {/* Breathing card effect - shimmer skeleton */}
      <div className="space-y-2.5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#252525]/50 to-transparent animate-shimmer-slide" />
        <div className="h-3.5 bg-[#1a1a1a] rounded-md" style={{ width: '90%' }} />
        <div className="h-3.5 bg-[#1a1a1a] rounded-md" style={{ width: '75%' }} />
        <div className="h-3.5 bg-[#1a1a1a] rounded-md" style={{ width: '60%' }} />
      </div>
    </div>
  );
};

// Enhanced typing cursor with smooth animation
const TypingCursor = ({ isVisible = true }: { isVisible?: boolean }) => (
  <span
    className={`inline-block w-[2px] h-[1.1em] bg-cyan-400 ml-0.5 align-middle transition-opacity duration-300 ${
      isVisible ? 'animate-cursor-blink' : 'opacity-0'
    }`}
    style={{
      boxShadow: '0 0 8px rgba(34, 211, 238, 0.5)',
      verticalAlign: 'text-bottom',
    }}
  />
);

// Live code block component - renders code as it streams in
const LiveCodeBlock = ({
  language,
  code,
  isStreaming,
  filename,
  onPreview,
}: {
  language: string;
  code: string;
  isStreaming: boolean;
  filename?: string;
  onPreview?: () => void;
}) => {
  const codeRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  // Auto-scroll code block while streaming
  useEffect(() => {
    if (isStreaming && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [code, isStreaming]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPreviewable = ['html', 'htm', 'jsx', 'tsx', 'react', 'javascript', 'js', 'css'].includes(language.toLowerCase());

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#0d0d0d] animate-fade-in">
      {/* Code block header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161616] border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#666]" />
          <span className="text-xs font-medium text-[#888] uppercase tracking-wider">
            {filename || language}
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] text-cyan-400 font-medium">LIVE</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isPreviewable && onPreview && !isStreaming && (
            <button
              onClick={onPreview}
              className="p-1.5 rounded-md hover:bg-[#252525] transition-colors group"
              title="Preview code"
            >
              <Play className="w-3.5 h-3.5 text-[#666] group-hover:text-cyan-400 transition-colors" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-[#252525] transition-colors group"
            title="Copy code"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#666] group-hover:text-[#999] transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* Code content with live streaming */}
      <pre
        ref={codeRef}
        className="p-4 overflow-x-auto max-h-[400px] overflow-y-auto text-sm font-mono leading-relaxed scroll-smooth"
        style={{ tabSize: 2 }}
      >
        <code className="text-[#e5e5e5]">
          {code}
          {isStreaming && <TypingCursor />}
        </code>
      </pre>

      {/* Live preview indicator bar */}
      {isStreaming && (
        <div className="h-0.5 bg-gradient-to-r from-cyan-500/0 via-cyan-500 to-cyan-500/0 animate-shimmer-slide" />
      )}
    </div>
  );
};

// Extract and render code blocks with live streaming support
const renderContentWithCodeBlocks = (
  content: string,
  isStreaming: boolean,
  onPreview?: (blocks: CodeBlock[]) => void
): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w+)?(?:\s+(\S+))?\n([\s\S]*?)(?:```|$)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push(
          <div key={`text-${key++}`} className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="text-[#ddd] text-[15px] leading-[1.75] mb-4 last:mb-0">{children}</p>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors">
                    {children}
                  </a>
                ),
                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                em: ({ children }) => <em className="text-[#bbb]">{children}</em>,
                code: ({ children }) => (
                  <code className="bg-[#1e1e1e] px-1.5 py-0.5 rounded text-cyan-300 text-sm font-mono">{children}</code>
                ),
                pre: () => null,
                ul: ({ children }) => <ul className="list-disc list-outside ml-5 space-y-1.5 text-[#ddd] mb-4">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-outside ml-5 space-y-1.5 text-[#ddd] mb-4">{children}</ol>,
                li: ({ children }) => <li className="text-[#ddd] text-[15px] leading-[1.75]">{children}</li>,
              }}
            >
              {textBefore}
            </ReactMarkdown>
          </div>
        );
      }
    }

    const [fullMatch, language = 'text', filename, code] = match;
    const isCodeComplete = fullMatch.endsWith('```');
    const isThisBlockStreaming = isStreaming && !isCodeComplete;

    parts.push(
      <LiveCodeBlock
        key={`code-${key++}`}
        language={language}
        code={code.trim()}
        isStreaming={isThisBlockStreaming}
        filename={filename}
        onPreview={onPreview ? () => {
          const blocks = parseCodeBlocks(content);
          const previewable = ['html', 'htm', 'jsx', 'tsx', 'react', 'javascript', 'js', 'css'];
          onPreview(blocks.filter(b => previewable.includes(b.language)));
        } : undefined}
      />
    );

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text after last code block
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push(
        <div key={`text-${key++}`} className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p className="text-[#ddd] text-[15px] leading-[1.75] mb-4 last:mb-0">{children}</p>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors">
                  {children}
                </a>
              ),
              strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
              em: ({ children }) => <em className="text-[#bbb]">{children}</em>,
              code: ({ children }) => (
                <code className="bg-[#1e1e1e] px-1.5 py-0.5 rounded text-cyan-300 text-sm font-mono">{children}</code>
              ),
              pre: () => null,
              ul: ({ children }) => <ul className="list-disc list-outside ml-5 space-y-1.5 text-[#ddd] mb-4">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-outside ml-5 space-y-1.5 text-[#ddd] mb-4">{children}</ol>,
              li: ({ children }) => <li className="text-[#ddd] text-[15px] leading-[1.75]">{children}</li>,
            }}
          >
            {remainingText}
          </ReactMarkdown>
          {isStreaming && !content.includes('```') && <TypingCursor />}
        </div>
      );
    } else if (isStreaming && !content.includes('```')) {
      parts.push(<TypingCursor key={`cursor-${key++}`} />);
    }
  }

  return parts;
};

// Action buttons for AI messages
const MessageActions = ({
  content,
  onShowPreview
}: {
  content: string;
  onShowPreview?: (codeBlocks: CodeBlock[]) => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<'up' | 'down' | null>(null);

  const canPreview = hasPreviewableCode(content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = () => {
    setLiked(liked === 'up' ? null : 'up');
  };

  const handleDislike = () => {
    setLiked(liked === 'down' ? null : 'down');
  };

  const handleShowPreview = () => {
    if (onShowPreview && canPreview) {
      const blocks = getPreviewableBlocks(content);
      onShowPreview(blocks);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {/* Preview button */}
      {canPreview && onShowPreview && (
        <button
          onClick={handleShowPreview}
          className="p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-all duration-200 group/btn"
          title="Show preview"
        >
          <Eye className="w-4 h-4 text-[#666] group-hover/btn:text-[#999] transition-colors" />
        </button>
      )}

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-all duration-200 group/btn"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400 animate-scale-in" />
        ) : (
          <Copy className="w-4 h-4 text-[#666] group-hover/btn:text-[#999] transition-colors" />
        )}
      </button>

      {/* Thumbs up */}
      <button
        onClick={handleLike}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          liked === 'up'
            ? 'bg-green-500/10'
            : 'hover:bg-[#2a2a2a]'
        }`}
        title="Good response"
      >
        <ThumbsUp
          className={`w-4 h-4 transition-all duration-200 ${
            liked === 'up'
              ? 'text-green-400 scale-110 fill-green-400'
              : 'text-[#666] hover:text-[#999]'
          }`}
        />
      </button>

      {/* Thumbs down */}
      <button
        onClick={handleDislike}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          liked === 'down'
            ? 'bg-red-500/10'
            : 'hover:bg-[#2a2a2a]'
        }`}
        title="Bad response"
      >
        <ThumbsDown
          className={`w-4 h-4 transition-all duration-200 ${
            liked === 'down'
              ? 'text-red-400 scale-110 fill-red-400'
              : 'text-[#666] hover:text-[#999]'
          }`}
        />
      </button>
    </div>
  );
};

// AI Message component with streaming support and live code rendering
const AIMessage = ({
  message,
  onShowPreview,
  onLivePreview,
}: {
  message: Message;
  onShowPreview?: (codeBlocks: CodeBlock[]) => void;
  onLivePreview?: (codeBlocks: CodeBlock[]) => void;
}) => {
  const isThinking = message.isTyping && !message.content;
  const isStreaming = Boolean(message.isTyping && message.content);
  const hasCodeBlocks = message.content?.includes('```');
  const prevHasCodeRef = useRef(false);

  // Trigger live preview when code blocks are detected during streaming
  useEffect(() => {
    if (isStreaming && hasCodeBlocks && !prevHasCodeRef.current && onLivePreview) {
      const blocks = parseCodeBlocks(message.content);
      const previewable = ['html', 'htm', 'jsx', 'tsx', 'react', 'javascript', 'js', 'css'];
      const previewableBlocks = blocks.filter(b => previewable.includes(b.language));
      if (previewableBlocks.length > 0) {
        onLivePreview(previewableBlocks);
        prevHasCodeRef.current = true;
      }
    }
    if (!isStreaming) {
      prevHasCodeRef.current = false;
    }
  }, [message.content, isStreaming, hasCodeBlocks, onLivePreview]);

  // Memoize content rendering
  const renderedContent = useMemo(() => {
    if (!message.content) return null;

    // Use live code block rendering for content with code
    if (hasCodeBlocks) {
      return renderContentWithCodeBlocks(message.content, isStreaming, onShowPreview);
    }

    // Simple text rendering for non-code content
    return (
      <div className="relative">
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p className="text-[#ddd] text-[15px] leading-[1.75] mb-4 last:mb-0">{children}</p>
            ),
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors">
                {children}
              </a>
            ),
            strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
            em: ({ children }) => <em className="text-[#bbb]">{children}</em>,
            code: ({ children }) => (
              <code className="bg-[#1e1e1e] px-1.5 py-0.5 rounded text-cyan-300 text-sm font-mono">{children}</code>
            ),
            pre: () => null,
            ul: ({ children }) => <ul className="list-disc list-outside ml-5 space-y-1.5 text-[#ddd] mb-4">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-outside ml-5 space-y-1.5 text-[#ddd] mb-4">{children}</ol>,
            li: ({ children }) => <li className="text-[#ddd] text-[15px] leading-[1.75]">{children}</li>,
            h1: ({ children }) => <h1 className="text-xl font-semibold text-white mb-3 mt-6 first:mt-0">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold text-white mb-2 mt-5 first:mt-0">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold text-white mb-2 mt-4 first:mt-0">{children}</h3>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-[#444] pl-4 text-[#999] italic my-4">{children}</blockquote>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
        {isStreaming && <TypingCursor />}
      </div>
    );
  }, [message.content, isStreaming, hasCodeBlocks, onShowPreview]);

  if (isThinking) {
    return <ThinkingIndicator />;
  }

  return (
    <div className="animate-fade-in transition-all duration-300">
      {/* Content with live code blocks */}
      <div className="px-1">
        {renderedContent}
      </div>

      {/* Action buttons - fade in when done */}
      <div
        className={`px-1 transition-all duration-500 ${
          !message.isTyping && message.content
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <MessageActions
          content={message.content}
          onShowPreview={onShowPreview}
        />
      </div>
    </div>
  );
};

const Chat = ({ messages, onShowPreview, onLivePreview }: ChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new content - smoother behavior
  useEffect(() => {
    if (containerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = containerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;

      // Only auto-scroll if user is near bottom
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto py-4 scroll-smooth">
      <div className="space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} transition-all duration-300`}
          >
            {message.role === 'user' ? (
              // User message
              <div className="max-w-[85%] animate-slide-up">
                <div className="bg-[#1f1f1f] rounded-2xl px-4 py-3 border border-[#2a2a2a]">
                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {message.attachments.map((attachment, index) => (
                        <div key={index} className="w-20 h-20 rounded-lg overflow-hidden bg-[#0f0f0f]">
                          <img
                            src={attachment.dataUrl}
                            alt={`Attachment ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {message.content && message.content !== '[Attachment]' && (
                    <p className="text-[#e5e5e5] text-[15px] leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              // AI message with live code support
              <div className="max-w-full w-full group">
                <AIMessage
                  message={message}
                  onShowPreview={onShowPreview}
                  onLivePreview={onLivePreview}
                />
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default Chat;
