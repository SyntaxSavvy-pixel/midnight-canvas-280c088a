import { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  videos?: VideoResult[];
  images?: ImageResult[];
  thinking?: string;
  isStreaming?: boolean;
  createdAt: Date;
  webResults?: SearchResults;
  widget?: WidgetData;
}

export interface Source {
  title: string;
  url: string;
  snippet?: string;
  domain?: string;
  favicon?: string;
}

export interface VideoResult {
  title: string;
  url: string;
  thumbnail?: string | null;
  duration?: string | null;
  publisher?: string;
  views?: string | null;
  age?: string;
  isYouTube?: boolean;
}

export interface ImageResult {
  title: string;
  url: string;
  thumbnail?: string | null;
  source?: string;
  width?: number;
  height?: number;
}

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
  favicon?: string | null;
  age?: string | null;
}

export interface NewsResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  thumbnail?: string | null;
  age?: string;
}

export interface SearchResults {
  query: string;
  results: WebResult[];
  news?: NewsResult[];
  suggestions?: string[];
}

export interface UploadedFile {
  fileName: string;
  fileExtension: string;
  fileId: string;
  content?: string;
}

// Widget types for quick lookups
export interface WidgetData {
  type: 'weather' | 'calculator' | 'stock' | 'currency' | 'definition' | 'time';
  data: any;
}

// Search history entry
export interface SearchHistoryEntry {
  id: string;
  query: string;
  timestamp: Date;
  sourceFocus: SourceFocus;
}

export type OptimizationMode = 'speed' | 'balanced' | 'quality';
export type SourceFocus = 'all' | 'web' | 'academic' | 'news' | 'discussions' | 'images' | 'videos';

interface ApiKeys {
  openai: string;
  brave: string;
}

interface PerplexicaChatContextType {
  messages: Message[];
  isLoading: boolean;
  optimizationMode: OptimizationMode;
  sourceFocus: SourceFocus;
  domainFilter: string;
  files: UploadedFile[];
  apiKeys: ApiKeys;
  searchHistory: SearchHistoryEntry[];
  suggestions: string[];
  setOptimizationMode: (mode: OptimizationMode) => void;
  setSourceFocus: (focus: SourceFocus) => void;
  setDomainFilter: (domain: string) => void;
  sendMessage: (content: string) => Promise<void>;
  uploadFiles: (fileList: FileList) => Promise<void>;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  clearChat: () => void;
  clearHistory: () => void;
  getSuggestions: (query: string) => Promise<void>;
}

const PerplexicaChatContext = createContext<PerplexicaChatContextType | undefined>(undefined);

const getStoredApiKeys = (): ApiKeys => {
  try {
    const stored = localStorage.getItem('tabkeep_api_keys');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load API keys');
  }
  return { openai: '', brave: '' };
};

const getStoredHistory = (): SearchHistoryEntry[] => {
  try {
    const stored = localStorage.getItem('tabkeep_search_history');
    if (stored) {
      return JSON.parse(stored).map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
    }
  } catch (e) {
    console.error('Failed to load search history');
  }
  return [];
};

const saveHistory = (history: SearchHistoryEntry[]) => {
  try {
    // Keep only the last 100 entries
    const trimmed = history.slice(0, 100);
    localStorage.setItem('tabkeep_search_history', JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save search history');
  }
};

export const PerplexicaChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('balanced');
  const [sourceFocus, setSourceFocus] = useState<SourceFocus>('all');
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ openai: '', brave: '' });
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load API keys and history on mount
  useEffect(() => {
    setApiKeys(getStoredApiKeys());
    setSearchHistory(getStoredHistory());

    const handleStorageChange = () => {
      setApiKeys(getStoredApiKeys());
      setSearchHistory(getStoredHistory());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getApiBaseUrl = () => {
    if (import.meta.env.DEV) {
      return 'http://localhost:3000';
    }
    return '';
  };

  // Get suggestions as user types
  const getSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  };

  const uploadFiles = async (fileList: FileList) => {
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/perplexica/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const data = await response.json();
      setFiles(prev => [...prev, ...data.files]);
      toast.success(`${data.files.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.fileId !== fileId));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('tabkeep_search_history');
    toast.success('Search history cleared');
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add to search history
    const historyEntry: SearchHistoryEntry = {
      id: Date.now().toString(),
      query: content,
      timestamp: new Date(),
      sourceFocus,
    };
    const newHistory = [historyEntry, ...searchHistory];
    setSearchHistory(newHistory);
    saveHistory(newHistory);

    // Clear suggestions
    setSuggestions([]);

    const currentKeys = getStoredApiKeys();

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isStreaming: true,
      sources: [],
      thinking: '',
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      abortControllerRef.current = new AbortController();
      const baseUrl = getApiBaseUrl();

      const response = await fetch(`${baseUrl}/api/perplexica/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-Api-Key': currentKeys.openai,
          'X-Brave-Api-Key': currentKeys.brave || '',
        },
        body: JSON.stringify({
          message: content,
          optimizationMode,
          sourceFocus,
          domainFilter: domainFilter || undefined,
          files: files.map(f => ({ fileId: f.fileId, content: f.content })),
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Chat API request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';
      let accumulatedThinking = '';
      let sources: Source[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'thinking') {
              accumulatedThinking = data.content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessage.id
                    ? { ...m, thinking: accumulatedThinking }
                    : m
                )
              );
            } else if (data.type === 'content') {
              accumulatedContent += data.content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessage.id
                    ? { ...m, content: accumulatedContent }
                    : m
                )
              );
            } else if (data.type === 'sources') {
              sources = data.sources;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessage.id
                    ? {
                        ...m,
                        sources,
                        videos: data.videos || [],
                        images: data.images || [],
                      }
                    : m
                )
              );
            } else if (data.type === 'widget') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessage.id
                    ? { ...m, widget: data.widget }
                    : m
                )
              );
            } else if (data.type === 'done') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessage.id
                    ? { ...m, isStreaming: false }
                    : m
                )
              );
            } else if (data.type === 'error') {
              throw new Error(data.message || 'An error occurred');
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'An error occurred') {
              console.warn('Failed to parse SSE data:', e);
            } else {
              throw e;
            }
          }
        }
      }

      clearFiles();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Chat error:', error);
        toast.error(error.message || 'Failed to send message');
        setMessages(prev => prev.filter(m => m.id !== assistantMessage.id));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const clearChat = () => {
    setMessages([]);
    clearFiles();
  };

  return (
    <PerplexicaChatContext.Provider
      value={{
        messages,
        isLoading,
        optimizationMode,
        sourceFocus,
        domainFilter,
        files,
        apiKeys,
        searchHistory,
        suggestions,
        setOptimizationMode,
        setSourceFocus,
        setDomainFilter,
        sendMessage,
        uploadFiles,
        removeFile,
        clearFiles,
        clearChat,
        clearHistory,
        getSuggestions,
      }}
    >
      {children}
    </PerplexicaChatContext.Provider>
  );
};

export const usePerplexicaChat = () => {
  const context = useContext(PerplexicaChatContext);
  if (!context) {
    throw new Error('usePerplexicaChat must be used within PerplexicaChatProvider');
  }
  return context;
};
