import { useEffect, useRef } from 'react';
import { Loader2, ExternalLink, Play, Image as ImageIcon } from 'lucide-react';

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

// Source card component
const SourceCard = ({ source, index }: { source: Source; index: number }) => (
  <a
    href={source.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex-shrink-0 w-48 p-3 bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-colors group"
  >
    <div className="flex items-center gap-2 mb-2">
      <img
        src={source.favicon}
        alt=""
        className="w-4 h-4 rounded"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      <span className="text-xs text-muted-foreground truncate">{source.domain}</span>
      <span className="ml-auto text-xs text-primary font-medium">[{index + 1}]</span>
    </div>
    <p className="text-xs text-foreground/80 line-clamp-2 group-hover:text-foreground transition-colors">
      {source.title}
    </p>
  </a>
);

// Video card component
const VideoCard = ({ video }: { video: VideoResult }) => (
  <a
    href={video.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex-shrink-0 w-40 group"
  >
    <div className="relative rounded-lg overflow-hidden bg-secondary/30 aspect-video mb-2">
      {video.thumbnail ? (
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Play className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
        <Play className="w-8 h-8 text-white" />
      </div>
      {video.isYouTube && (
        <span className="absolute top-1 right-1 text-[10px] bg-red-600 text-white px-1 rounded">
          YouTube
        </span>
      )}
      {video.duration && (
        <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1 rounded">
          {video.duration}
        </span>
      )}
    </div>
    <p className="text-xs text-foreground/80 line-clamp-2">{video.title}</p>
  </a>
);

// Image card component
const ImageCard = ({ image }: { image: ImageResult }) => (
  <a
    href={image.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-secondary/30 group"
  >
    {image.thumbnail ? (
      <img
        src={image.thumbnail}
        alt={image.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <ImageIcon className="w-6 h-6 text-muted-foreground" />
      </div>
    )}
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

  // Convert markdown links and citations to clickable links
  const formatContent = (content: string, sources?: Source[]) => {
    if (!content) return null;

    // Replace citation numbers [1], [2], etc. with clickable links
    let formatted = content;
    if (sources && sources.length > 0) {
      formatted = content.replace(/\[(\d+)\]/g, (match, num) => {
        const index = parseInt(num) - 1;
        if (sources[index]) {
          return `<a href="${sources[index].url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">[${num}]</a>`;
        }
        return match;
      });
    }

    return (
      <p
        className="text-sm whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: formatted }}
      />
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`
              max-w-[85%] rounded-2xl
              ${message.role === 'user'
                ? 'bg-primary/10 text-foreground px-4 py-3'
                : 'bg-transparent text-foreground/90'
              }
            `}
          >
            {message.role === 'assistant' && (
              <>
                {/* Sources section */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">Sources</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {message.sources.slice(0, 6).map((source, idx) => (
                        <SourceCard key={idx} source={source} index={idx} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Videos section */}
                {message.videos && message.videos.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Play className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">Videos</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {message.videos.slice(0, 4).map((video, idx) => (
                        <VideoCard key={idx} video={video} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Images section */}
                {message.images && message.images.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">Images</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {message.images.slice(0, 6).map((image, idx) => (
                        <ImageCard key={idx} image={image} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Message content */}
            <div className={message.role === 'assistant' ? 'bg-secondary/50 rounded-2xl px-4 py-3' : ''}>
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
                formatContent(message.content, message.sources)
              )}
            </div>
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
