/**
 * useAIChat Hook - Simple AI chat with streaming
 * All API calls go through /api/chat (server-side, secure)
 * Includes intelligence tracking and limit handling
 */

import { useState, useCallback, useRef } from 'react';

export interface MessageAttachment {
  type: 'image' | 'video';
  dataUrl: string; // base64 data URL
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  attachments?: MessageAttachment[];
}

export interface LimitError {
  error: 'limit_reached';
  message: string;
  resetAt?: string;
  showUpgrade?: boolean;
}

export interface AttachmentInput {
  type: 'image' | 'video';
  dataUrl: string;
  frames?: string[]; // For videos: extracted frame data URLs
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export interface UseAIChatOptions {
  onCodeDetected?: (blocks: CodeBlock[]) => void;
}

export interface UseAIChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  limitError: LimitError | null;
  currentCodeBlocks: CodeBlock[];
  sendMessage: (content: string, userId?: string, chatId?: string, attachments?: AttachmentInput[], anchorId?: string) => Promise<void>;
  stopGeneration: () => void;
  clearMessages: () => void;
  setMessages: (messages: Message[]) => void;
  clearLimitError: () => void;
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

// Check if content has previewable code
function hasPreviewableCode(content: string): boolean {
  const blocks = parseCodeBlocks(content);
  const previewable = ['html', 'htm', 'jsx', 'tsx', 'react', 'javascript', 'js', 'css'];
  return blocks.some(b => previewable.includes(b.language));
}

export const useAIChat = (options?: UseAIChatOptions): UseAIChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<LimitError | null>(null);
  const [currentCodeBlocks, setCurrentCodeBlocks] = useState<CodeBlock[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const codeDetectedRef = useRef(false);
  const lastExtractionRef = useRef<number>(0);

  /**
   * Send a message and get AI response with streaming
   */
  const sendMessage = useCallback(async (content: string, userId?: string, chatId?: string, attachments?: AttachmentInput[], anchorId?: string) => {
    const trimmedContent = content.trim();
    const hasAttachments = attachments && attachments.length > 0;

    if (!trimmedContent && !hasAttachments) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setError(null);
    setLimitError(null);
    setIsLoading(true);
    setCurrentCodeBlocks([]);
    codeDetectedRef.current = false;

    // Prepare attachment data for message display
    const messageAttachments: MessageAttachment[] | undefined = hasAttachments
      ? attachments.map(a => ({
          type: a.type,
          dataUrl: a.type === 'video' && a.frames?.[0] ? a.frames[0] : a.dataUrl,
        }))
      : undefined;

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedContent || (hasAttachments ? '[Attachment]' : ''),
      attachments: messageAttachments,
    };

    const assistantMessageId = crypto.randomUUID();

    // Add user message and assistant placeholder
    setMessages(prev => [
      ...prev,
      userMessage,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        isTyping: true,
      },
    ]);

    try {
      // Build conversation history
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Prepare images for API (for GPT-4o vision)
      const images: string[] = [];
      if (hasAttachments) {
        for (const attachment of attachments) {
          if (attachment.type === 'image') {
            images.push(attachment.dataUrl);
          } else if (attachment.type === 'video' && attachment.frames) {
            // Add video frames as images
            images.push(...attachment.frames);
          }
        }
      }

      // Call the secure server-side API with userId, chatId, and anchorId
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedContent || 'What is in this image/video?',
          history,
          userId,
          chatId,
          anchorId, // Memory anchor for context
          images: images.length > 0 ? images : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      // Handle limit reached (429)
      if (response.status === 429) {
        const limitData = await response.json().catch(() => ({}));
        setLimitError({
          error: 'limit_reached',
          message: limitData.message || 'You\'ve reached your limit',
          resetAt: limitData.resetAt,
          showUpgrade: limitData.showUpgrade,
        });

        // Remove the placeholder assistant message
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
        // Also remove the user message since it wasn't processed
        setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'content' && data.content) {
              assistantContent += data.content;
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: assistantContent }
                    : msg
                )
              );

              // Check for code blocks and notify
              if (hasPreviewableCode(assistantContent)) {
                const blocks = parseCodeBlocks(assistantContent);
                const previewable = ['html', 'htm', 'jsx', 'tsx', 'react', 'javascript', 'js', 'css'];
                const previewableBlocks = blocks.filter(b => previewable.includes(b.language));

                if (previewableBlocks.length > 0) {
                  setCurrentCodeBlocks(previewableBlocks);

                  // Only call onCodeDetected once per message
                  if (!codeDetectedRef.current && options?.onCodeDetected) {
                    codeDetectedRef.current = true;
                    options.onCodeDetected(previewableBlocks);
                  }
                }
              }
            } else if (data.type === 'regenerating') {
              // Quality judge triggered regeneration - clear content for fresh response
              assistantContent = '';
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: '', isTyping: true }
                    : msg
                )
              );
            } else if (data.type === 'done') {
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, isTyping: false }
                    : msg
                )
              );
            } else if (data.type === 'error') {
              throw new Error(data.message || 'Stream error');
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Ensure typing is false at the end
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, isTyping: false }
            : msg
        )
      );

      // Auto-extract memories after meaningful conversations (4+ messages)
      const totalMessages = messages.length + 2; // +2 for user msg + assistant msg just added
      const now = Date.now();
      const timeSinceLastExtraction = now - lastExtractionRef.current;
      if (totalMessages >= 4 && userId && assistantContent && timeSinceLastExtraction > 30000) {
        lastExtractionRef.current = now;
        const allMessages = [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: trimmedContent },
          { role: 'assistant' as const, content: assistantContent },
        ];
        // Fire and forget - don't await, don't block
        const API_URL = import.meta.env?.VITE_API_URL || '';
        fetch(`${API_URL}/api/extract-memory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            chatId,
            anchorId,
            messages: allMessages,
          }),
        }).catch(() => {
          // Silently fail - memory extraction is non-critical
        });
      }

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }

      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Chat error:', errorMessage);
      setError(errorMessage);

      // Update assistant message with error
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `Sorry, something went wrong: ${errorMessage}`,
                isTyping: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setError(null);
    setLimitError(null);
    setIsLoading(false);
  }, []);

  /**
   * Load saved messages
   */
  const loadMessages = useCallback((savedMessages: Message[]) => {
    setMessages(savedMessages);
    setError(null);
  }, []);

  /**
   * Clear limit error (e.g., when user closes the modal)
   */
  const clearLimitError = useCallback(() => {
    setLimitError(null);
  }, []);

  /**
   * Stop the current generation
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);

      // Mark any typing messages as complete
      setMessages(prev =>
        prev.map(msg =>
          msg.isTyping ? { ...msg, isTyping: false } : msg
        )
      );
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    limitError,
    currentCodeBlocks,
    sendMessage,
    stopGeneration,
    clearMessages,
    setMessages: loadMessages,
    clearLimitError,
  };
};
