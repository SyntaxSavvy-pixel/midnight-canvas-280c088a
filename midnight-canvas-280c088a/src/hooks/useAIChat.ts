/**
 * useAIChat Hook - Real AI chat with GPT-5-nano
 *
 * Uses OpenAI GPT-5-nano for fast, human-like responses
 * Handles conversation history and error states
 */

import { useState, useCallback } from 'react';
import { advancedAIService, ChatMessage } from '@/services/ai/advanced-ai.service';

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
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  loadMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  isConfigured: boolean;
}

export const useAIChat = (): UseAIChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = advancedAIService.getConfiguredProviders().length > 0;

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
      // Keep only last 10 messages to prevent token overflow
      const recentMessages = messages.slice(-10);

      // Convert to ChatMessage format
      const conversationHistory: ChatMessage[] = [
        {
          role: 'system',
          content: `You are a helpful AI assistant powered by GPT-5-nano, integrated into TabKeep, a multi-platform search application.

Your role:
- Answer user questions clearly and concisely
- Be friendly and conversational
- Provide useful information
- If asked about your identity, say you're powered by OpenAI's GPT-5-nano model
- If asked about searching platforms, explain that TabKeep can search across Google, YouTube, GitHub, Reddit, Spotify, TikTok, Twitter, Instagram, LinkedIn, Indeed, Pinterest, and Facebook

Keep responses focused and helpful. Current year: 2026.`
        },
        ...recentMessages.map(msg => ({
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

      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        isTyping: true
      }]);

      // Get AI response using GPT-5-nano
      const provider = advancedAIService.getProvider();
      console.log('Sending request to GPT-5-nano...', {
        provider: provider.name,
        messageCount: conversationHistory.length
      });

      const response = await provider.chat(conversationHistory, {
        maxTokens: 4096 // Increased for better responses
      });

      console.log('Received response from GPT-5-nano:', {
        length: response?.length,
        preview: response?.slice(0, 100)
      });

      // Check if response is empty
      if (!response || response.trim() === '') {
        throw new Error('Received empty response from AI');
      }

      // Update with final response
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: response, isTyping: false }
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
            ? 'Please configure your OpenAI GPT-5-nano API key to enable AI chat.'
            : 'Please try again in a moment.'
        }`
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isConfigured]);

  /**
   * Edit a user message and regenerate AI response
   */
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    // Find the message index
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Remove the message and all messages after it
    const updatedMessages = messages.slice(0, messageIndex);
    setMessages(updatedMessages);

    // Send the edited message as a new message
    await sendMessage(newContent);
  }, [messages, sendMessage]);

  /**
   * Load messages from chat history
   */
  const loadMessages = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
    setError(null);
  }, []);

  /**
   * Clear conversation history
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    editMessage,
    loadMessages,
    clearMessages,
    isConfigured
  };
};
