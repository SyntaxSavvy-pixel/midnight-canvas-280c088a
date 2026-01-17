import { Message, Source, VideoResult, ImageResult } from '@/contexts/PerplexicaChatContext';
import { ExternalLink, Play, Image as ImageIcon, Globe, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState, useMemo } from 'react';

interface PerplexicaMessageBoxProps {
  message: Message;
  isLast?: boolean;
}

// Citation badge component - inline clickable reference
const CitationBadge = ({ num, url }: { num: number; url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-semibold bg-primary/20 text-primary hover:bg-primary hover:text-white rounded transition-colors mx-0.5 align-super cursor-pointer"
    title={`Source ${num}`}
  >
    {num}
  </a>
);

// Source card component - horizontal scrollable
const SourceCard = ({ source, index }: { source: Source; index: number }) => (
  <a
    href={source.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex-shrink-0 w-[200px] p-3 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-secondary/50 transition-all group"
  >
    <div className="flex items-start gap-2">
      <div className="relative">
        {source.favicon ? (
          <img
            src={source.favicon}
            alt=""
            className="w-5 h-5 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Globe size={16} className="text-foreground/40" />
        )}
        <span className="absolute -top-1 -left-1 w-4 h-4 bg-primary text-[9px] font-bold text-white rounded-full flex items-center justify-center">
          {index + 1}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {source.title}
        </p>
        <p className="text-[10px] text-foreground/50 truncate mt-1">
          {source.domain || new URL(source.url).hostname}
        </p>
      </div>
    </div>
  </a>
);

// Video card component
const VideoCard = ({ video }: { video: VideoResult }) => (
  <a
    href={video.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex-shrink-0 w-[180px] group"
  >
    <div className="relative rounded-lg overflow-hidden bg-secondary aspect-video">
      {video.thumbnail ? (
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-secondary">
          <Play size={24} className="text-foreground/30" />
        </div>
      )}
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
          <Play size={18} className="text-black ml-0.5" fill="black" />
        </div>
      </div>
      {/* Duration badge */}
      {video.duration && (
        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
          {video.duration}
        </span>
      )}
      {/* YouTube badge */}
      {video.isYouTube && (
        <span className="absolute top-1 left-1 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
          YouTube
        </span>
      )}
    </div>
    <p className="text-xs font-medium text-foreground mt-2 line-clamp-2 group-hover:text-primary transition-colors">
      {video.title}
    </p>
    {video.publisher && (
      <p className="text-[10px] text-foreground/50 mt-0.5">{video.publisher}</p>
    )}
  </a>
);

// Image card component
const ImageCard = ({ image }: { image: ImageResult }) => (
  <a
    href={image.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex-shrink-0 w-[120px] group"
  >
    <div className="relative rounded-lg overflow-hidden bg-secondary aspect-square">
      {image.thumbnail ? (
        <img
          src={image.thumbnail}
          alt={image.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon size={24} className="text-foreground/30" />
        </div>
      )}
    </div>
  </a>
);

// Process content to add inline citations
const processContentWithCitations = (content: string, sources: Source[]) => {
  if (!sources || sources.length === 0) return content;

  // Replace [1], [2], etc. with clickable citation badges
  // The markdown renderer will handle converting these
  return content;
};

const PerplexicaMessageBox = ({ message, isLast }: PerplexicaMessageBoxProps) => {
  const isUser = message.role === 'user';
  const [showAllSources, setShowAllSources] = useState(false);

  const displayedSources = useMemo(() => {
    if (!message.sources) return [];
    return showAllSources ? message.sources : message.sources.slice(0, 6);
  }, [message.sources, showAllSources]);

  // User message - simple query display
  if (isUser) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-medium text-foreground">
          {message.content}
        </h2>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Thinking/Searching indicator */}
      {message.thinking && message.isStreaming && (
        <div className="flex items-center gap-2 text-sm text-foreground/60">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '200ms' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '400ms' }} />
          </div>
          <span>{message.thinking}</span>
        </div>
      )}

      {/* Sources - Horizontal scrollable cards like Brave/Perplexity */}
      {message.sources && message.sources.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-primary" />
              <span className="text-sm font-medium text-foreground/70">Sources</span>
            </div>
            {message.sources.length > 6 && (
              <button
                onClick={() => setShowAllSources(!showAllSources)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {showAllSources ? 'Show less' : `View all ${message.sources.length}`}
                <ChevronRight size={12} className={showAllSources ? 'rotate-90' : ''} />
              </button>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {displayedSources.map((source, idx) => (
              <SourceCard key={idx} source={source} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Videos section */}
      {message.videos && message.videos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Play size={14} className="text-primary" />
            <span className="text-sm font-medium text-foreground/70">Videos</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {message.videos.slice(0, 6).map((video, idx) => (
              <VideoCard key={idx} video={video} />
            ))}
          </div>
        </div>
      )}

      {/* Images section */}
      {message.images && message.images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ImageIcon size={14} className="text-primary" />
            <span className="text-sm font-medium text-foreground/70">Images</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {message.images.slice(0, 8).map((image, idx) => (
              <ImageCard key={idx} image={image} />
            ))}
          </div>
        </div>
      )}

      {/* Main content with inline citations */}
      {message.content && (
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-a:text-primary prose-strong:text-foreground prose-code:text-foreground prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
          <ReactMarkdown
            components={{
              a: ({ node, href, ...props }) => {
                // Check if this is a citation link [1], [2], etc.
                const text = String(props.children);
                const citationMatch = text.match(/^\[(\d+)\]$/);
                if (citationMatch && message.sources) {
                  const num = parseInt(citationMatch[1]);
                  const source = message.sources[num - 1];
                  if (source) {
                    return <CitationBadge num={num} url={source.url} />;
                  }
                }
                return (
                  <a
                    href={href}
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    {props.children}
                    <ExternalLink size={10} className="opacity-50" />
                  </a>
                );
              },
              p: ({ node, children, ...props }) => {
                // Process inline citations in text like [1], [2]
                const processedChildren = processCitationsInChildren(children, message.sources || []);
                return (
                  <p className="text-foreground/90 leading-relaxed" {...props}>
                    {processedChildren}
                  </p>
                );
              },
              code: ({ node, inline, className, children, ...props }: any) => {
                if (inline) {
                  return (
                    <code className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <pre className="bg-secondary rounded-xl p-4 overflow-x-auto">
                    <code className="text-sm font-mono" {...props}>
                      {children}
                    </code>
                  </pre>
                );
              },
              ul: ({ node, ...props }) => (
                <ul className="space-y-1 list-disc list-inside" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="space-y-1 list-decimal list-inside" {...props} />
              ),
              li: ({ node, children, ...props }) => {
                const processedChildren = processCitationsInChildren(children, message.sources || []);
                return <li {...props}>{processedChildren}</li>;
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      )}

      {/* Empty streaming state */}
      {message.isStreaming && !message.content && !message.thinking && (
        <div className="flex items-center gap-2 text-foreground/50">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '200ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '400ms' }} />
          </div>
          <span className="text-sm">Thinking...</span>
        </div>
      )}
    </div>
  );
};

// Helper function to process citations in React children
function processCitationsInChildren(children: React.ReactNode, sources: Source[]): React.ReactNode {
  if (!children) return children;

  const processNode = (node: React.ReactNode, key?: number): React.ReactNode => {
    if (typeof node === 'string') {
      // Find all [n] patterns and replace with CitationBadge
      const parts = node.split(/(\[\d+\])/g);
      if (parts.length === 1) return node;

      return parts.map((part, idx) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const num = parseInt(match[1]);
          const source = sources[num - 1];
          if (source) {
            return <CitationBadge key={`cite-${idx}`} num={num} url={source.url} />;
          }
        }
        return part;
      });
    }

    if (Array.isArray(node)) {
      return node.map((child, idx) => processNode(child, idx));
    }

    return node;
  };

  return processNode(children);
}

export default PerplexicaMessageBox;
