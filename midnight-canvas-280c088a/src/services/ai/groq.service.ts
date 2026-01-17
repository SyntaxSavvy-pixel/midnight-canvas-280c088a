/**
 * Groq AI Service - FREE AI Chat with Llama Models
 *
 * Features:
 * - 100% FREE (no credit card required)
 * - Extremely fast inference (fastest available)
 * - Llama 3.1 70B model (ChatGPT quality)
 * - Streaming support for better UX
 * - Rate limit: 30 requests/minute (plenty for small apps)
 *
 * Get your free API key: https://console.groq.com/keys
 */

import Groq from 'groq-sdk';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

class GroqService {
  private client: Groq | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = import.meta.env.VITE_GROQ_API_KEY;

    if (this.apiKey && this.apiKey !== 'your_groq_api_key_here') {
      this.client = new Groq({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true // Required for client-side use
      });
    }
  }

  /**
   * Check if Groq is properly configured
   */
  isConfigured(): boolean {
    return this.client !== null && this.apiKey !== 'your_groq_api_key_here';
  }

  /**
   * Generate AI response (non-streaming)
   */
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error(
        'Groq API key not configured. Get your free key at https://console.groq.com/keys'
      );
    }

    try {
      const completion = await this.client!.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Latest Llama model (Dec 2024)
        messages: messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        top_p: 1,
        stream: false,
      });

      return completion.choices[0]?.message?.content || 'No response generated';
    } catch (error: any) {
      console.error('Groq API error:', error);

      if (error.message?.includes('rate_limit')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }

      throw new Error(`AI chat failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Generate AI response with streaming
   */
  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    if (!this.isConfigured()) {
      throw new Error(
        'Groq API key not configured. Get your free key at https://console.groq.com/keys'
      );
    }

    try {
      const stream = await this.client!.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Latest Llama model (Dec 2024)
        messages: messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        top_p: 1,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
    } catch (error: any) {
      console.error('Groq streaming error:', error);

      if (error.message?.includes('rate_limit')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }

      throw new Error(`AI chat failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Generate search intent analysis
   */
  async analyzeSearchIntent(query: string): Promise<{
    intent: string;
    contentTypes: string[];
    suggestedPlatforms: string[];
  }> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a search intent analyzer. Analyze user queries and determine:
1. Primary intent (learn, find content, compare, job search, etc.)
2. Content types they want (videos, articles, code, music, jobs, etc.)
3. Best platforms to search (YouTube, GitHub, Reddit, etc.)

Respond in JSON format only.`
      },
      {
        role: 'user',
        content: `Analyze this search query: "${query}"

Return JSON:
{
  "intent": "string",
  "contentTypes": ["type1", "type2"],
  "suggestedPlatforms": ["platform1", "platform2"]
}`
      }
    ];

    const response = await this.chat(messages, { temperature: 0.3 });

    try {
      // Extract JSON from response (handle if wrapped in markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse intent analysis:', error);

      // Fallback
      return {
        intent: 'general search',
        contentTypes: ['articles', 'videos'],
        suggestedPlatforms: ['google', 'youtube']
      };
    }
  }

  /**
   * Generate smart follow-up questions
   */
  async generateFollowUpQuestions(query: string): Promise<string[]> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You generate smart clarifying questions to improve search results. Return only a JSON array of 2-3 short questions.'
      },
      {
        role: 'user',
        content: `User wants to search: "${query}"

Generate 2-3 clarifying questions to improve their search.
Return JSON array: ["question1", "question2", "question3"]`
      }
    ];

    const response = await this.chat(messages, { temperature: 0.5, maxTokens: 200 });

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse follow-up questions:', error);
      return [
        'What type of content are you looking for?',
        'Do you prefer recent or popular results?'
      ];
    }
  }

  /**
   * Rank search results by relevance (NEW FOR MULTI-PLATFORM SEARCH)
   */
  async rankResults(
    query: string,
    results: any[]
  ): Promise<any[]> {
    if (!results || results.length === 0) {
      return [];
    }

    // Process in batches of 20 to avoid token limits
    const batchSize = 20;
    const batches = this.chunkArray(results, batchSize);
    const scoredResults: any[] = [];

    for (const batch of batches) {
      try {
        const messages: ChatMessage[] = [
          {
            role: 'system',
            content: 'Score search results for relevance to the query (0.0 to 1.0). Return ONLY a JSON array of scores: [0.95, 0.82, ...]'
          },
          {
            role: 'user',
            content: `Query: "${query}"

Results:
${batch.map((r, i) =>
  `${i}. [${r.platform}] ${r.title}: ${(r.description || '').slice(0, 150)}`
).join('\n')}

Return relevance scores as JSON array of numbers.`
          }
        ];

        const response = await this.chat(messages, { temperature: 0.2, maxTokens: 200 });
        const scores = this.extractJSON(response);

        // Apply scores to results
        batch.forEach((result, i) => {
          result.relevance_score = Array.isArray(scores) ? (scores[i] || 0.5) : 0.5;
          result.final_score = this.calculateFinalScore(result);
        });

        scoredResults.push(...batch);
      } catch (error) {
        console.error('Ranking batch error:', error);
        // On error, use default scores
        batch.forEach(result => {
          result.relevance_score = 0.5;
          result.final_score = this.calculateFinalScore(result);
        });
        scoredResults.push(...batch);
      }
    }

    // Sort by final score
    return scoredResults.sort((a, b) => b.final_score - a.final_score);
  }

  /**
   * Generate summary of search results (NEW FOR MULTI-PLATFORM SEARCH)
   */
  async summarizeResults(query: string, results: any[]): Promise<string> {
    if (!results || results.length === 0) {
      return 'No results found.';
    }

    const topResults = results.slice(0, 10);

    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'Summarize search results in 2-3 concise sentences. Be informative and helpful.'
        },
        {
          role: 'user',
          content: `Query: "${query}"

Top 10 results:
${topResults.map(r => `- [${r.platform}] ${r.title}`).join('\n')}

Provide a brief summary of what the user will find.`
        }
      ];

      return await this.chat(messages, { temperature: 0.7, maxTokens: 150 });
    } catch (error) {
      console.error('Summarization error:', error);
      return `Found ${results.length} results across ${new Set(results.map(r => r.platform)).size} platforms.`;
    }
  }

  // Helper methods for search functionality

  /**
   * Extract JSON from response (handles markdown wrapping)
   */
  private extractJSON(response: string): any {
    try {
      // Try to find JSON in response
      const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      // Try parsing whole response
      return JSON.parse(response);
    } catch (error) {
      console.error('JSON extraction failed:', error);
      return [];
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Calculate final score from component scores
   */
  private calculateFinalScore(result: any): number {
    const weights = {
      relevance: 0.50,    // 50% - Most important
      engagement: 0.30,   // 30% - Popularity matters
      freshness: 0.20     // 20% - Recency bonus
    };

    return (
      (result.relevance_score || 0.5) * weights.relevance +
      (result.engagement_score || 0.5) * weights.engagement +
      (result.freshness_score || 0.5) * weights.freshness
    );
  }
}

// Export singleton instance
export const groqService = new GroqService();
