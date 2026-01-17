/**
 * useAIChat Hook - Real AI chat with streaming support
 *
 * Uses free Groq API with Llama 3.1 models
 * Handles conversation history, streaming, and error states
 */

import { useState, useCallback } from 'react';
import { groqService, ChatMessage as GroqMessage } from '@/services/ai/groq.service';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

export interface UseAIChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setMessages: (messages: Message[]) => void;
  isConfigured: boolean;
}

export const useAIChat = (): UseAIChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = groqService.isConfigured();

  /**
   * Send a message and get AI response with streaming
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setError(null);
    setIsLoading(true);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Convert to Groq message format
      const conversationHistory: GroqMessage[] = [
        {
          role: 'system',
          content: `You are a helpful AI assistant integrated into TabKeep, a multi-platform search application.

Your role:
- Answer user questions clearly and concisely
- Be friendly and conversational
- Provide useful information
- If asked about searching platforms, explain that TabKeep can search across Google, YouTube, GitHub, Reddit, Spotify, TikTok, Twitter, Instagram, LinkedIn, Indeed, Pinterest, and Facebook

Keep responses focused and helpful.`
        },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        {
          role: 'user',
          content: content.trim()
        }
      ];

      // Create assistant message placeholder
      const assistantMessageId = (Date.now() + 1).toString();
      let assistantContent = '';

      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        isTyping: true
      }]);

      // Stream the response
      for await (const chunk of groqService.chatStream(conversationHistory)) {
        assistantContent += chunk;

        // Update message content in real-time
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: assistantContent, isTyping: true }
            : msg
        ));
      }

      // Mark as complete (remove typing indicator)
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, isTyping: false }
          : msg
      ));

    } catch (err: any) {
      console.error('AI chat error:', err);

      const errorMessage = err.message || 'Failed to get AI response';
      setError(errorMessage);

      // Add error message to chat
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}\n\n${
          !isConfigured
            ? 'Please configure your free Groq API key to enable AI chat.'
            : 'Please try again in a moment.'
        }`
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isConfigured]);

  /**
   * Clear conversation history
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
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
    isConfigured
  };
};
