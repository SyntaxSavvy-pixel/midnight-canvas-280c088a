/**
 * useAIChat Hook - AI chat with Perplexica features
 *
 * Uses OpenAI + Brave Search API for intelligent search results
 * Features: Smart search modes, source focus, widgets, streaming
 */

import { useState, useCallback, useRef } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  sources?: Source[];
  videos?: VideoResult[];
  images?: ImageResult[];
}

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

export type SearchMode = 'speed' | 'balanced' | 'quality';
export type SourceFocus = 'all' | 'web' | 'academic' | 'news' | 'discussions' | 'images' | 'videos';

export interface UseAIChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
  clearMessages: () => void;
  setMessages: (messages: Message[]) => void;
  isConfigured: boolean;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  sourceFocus: SourceFocus;
  setSourceFocus: (focus: SourceFocus) => void;
}

export interface SendMessageOptions {
  forceSearch?: boolean;
  domainFilter?: string;
  fileContext?: string;
}

// API Server URL - empty string = relative URLs (works on Vercel)
const API_URL = import.meta.env.VITE_API_URL || '';

export const useAIChat = (): UseAIChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('balanced');
  const [sourceFocus, setSourceFocus] = useState<SourceFocus>('all');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if API is reachable (simple check)
  const isConfigured = true; // Will be checked at runtime

  /**
   * Send a message and get AI response with streaming
   */
  const sendMessage = useCallback(async (content: string, options: SendMessageOptions = {}) => {
    if (!content.trim()) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setError(null);
    setIsLoading(true);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim()
    };

    setMessages(prev => [...prev, userMessage]);

    // Create assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isTyping: true,
      sources: [],
      videos: [],
      images: [],
    }]);

    try {
      // Build conversation history (last 10 messages)
      const history = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Prepare request body
      const requestBody = {
        message: content.trim(),
        optimizationMode: searchMode,
        sourceFocus,
        history,
        forceSearch: options.forceSearch || false,
        domainFilter: options.domainFilter,
        fileContext: options.fileContext,
      };

      // Call the API with SSE streaming
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let sources: Source[] = [];
      let videos: VideoResult[] = [];
      let images: ImageResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'sources':
                  sources = data.sources || [];
                  videos = data.videos || [];
                  images = data.images || [];
                  // Update message with sources immediately
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, sources, videos, images }
                      : msg
                  ));
                  break;

                case 'content':
                  assistantContent += data.content;
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: assistantContent, isTyping: true }
                      : msg
                  ));
                  break;

                case 'thinking':
                  // Could display thinking status if needed
                  break;

                case 'done':
                  // Mark as complete
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, isTyping: false }
                      : msg
                  ));
                  break;

                case 'error':
                  throw new Error(data.message || 'Unknown error');
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }

      // Final update to ensure typing is false
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, isTyping: false }
          : msg
      ));

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }

      console.error('AI chat error:', err);
      const errorMessage = err.message || 'Failed to get AI response';
      setError(errorMessage);

      // Add error message to chat
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? {
              ...msg,
              content: `Sorry, I encountered an error: ${errorMessage}\n\nPlease make sure the API server is running at ${API_URL}`,
              isTyping: false
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, searchMode, sourceFocus]);

  /**
   * Clear conversation history
   */
  const clearMessages = useCallback(() => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  /**
   * Load messages from saved conversation
   */
  const loadMessages = useCallback((savedMessages: Message[]) => {
    setMessages(savedMessages);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    setMessages: loadMessages,
    isConfigured,
    searchMode,
    setSearchMode,
    sourceFocus,
    setSourceFocus,
  };
};
