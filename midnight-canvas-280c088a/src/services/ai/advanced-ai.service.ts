/**
 * Advanced AI Service - GPT-5-nano and Web Search Integration
 *
 * Features:
 * - OpenAI GPT-5-nano for fast, human-like responses
 * - Real-time web search integration for current information
 * - Intelligent "thinking" search like Perplexity
 * - Clean and efficient AI integration
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  name: string;
  chat: (messages: ChatMessage[], options?: ChatOptions) => Promise<string>;
  chatStream?: (messages: ChatMessage[], options?: ChatOptions) => AsyncGenerator<string, void, unknown>;
  isConfigured: () => boolean;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface SearchThought {
  step: string;
  reasoning: string;
  action?: string;
}

export interface IntelligentSearchResult {
  query: string;
  thoughts: SearchThought[];
  enhancedQuery: string;
  suggestedPlatforms: string[];
  searchStrategy: string;
}

class AdvancedAIService {
  private providers: Map<string, AIProvider> = new Map();
  private preferredProvider: string = 'openai'; // Default to OpenAI

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // OpenAI GPT-5-nano Provider - Fast, human-like, and efficient
    this.providers.set('openai', {
      name: 'OpenAI GPT-5-nano',
      chat: async (messages: ChatMessage[], options: ChatOptions = {}) => {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!apiKey || apiKey === 'your_openai_api_key_here') {
          throw new Error('OpenAI API key not configured');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-5-nano',
            messages: messages,
            max_completion_tokens: options.maxTokens ?? 2048
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response';
      },
      isConfigured: () => {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        return !!apiKey && apiKey !== 'your_openai_api_key_here';
      }
    });

    // Set preferred provider - OpenAI GPT-5-nano is the only provider
    if (this.providers.get('openai')?.isConfigured()) {
      this.preferredProvider = 'openai';
    }
  }

  /**
   * Get the best available AI provider
   */
  getProvider(preferredProvider?: string): AIProvider {
    if (preferredProvider && this.providers.has(preferredProvider)) {
      const provider = this.providers.get(preferredProvider)!;
      if (provider.isConfigured()) {
        return provider;
      }
    }

    // Try preferred provider
    const preferred = this.providers.get(this.preferredProvider);
    if (preferred?.isConfigured()) {
      return preferred;
    }

    // Fallback to any configured provider
    for (const provider of this.providers.values()) {
      if (provider.isConfigured()) {
        return provider;
      }
    }

    throw new Error('OpenAI GPT-5-nano API key not configured. Please add your API key to .env.local');
  }

  /**
   * Intelligent search with "thinking" process (like Perplexity)
   */
  async thinkAboutSearch(query: string): Promise<IntelligentSearchResult> {
    const provider = this.getProvider();
    const thoughts: SearchThought[] = [];

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an intelligent search assistant. When given a query, you think step-by-step about:
1. What the user really wants to know
2. What type of information would be most helpful
3. Which platforms would have the best results
4. How to refine the query for better results

Think out loud about your reasoning process. Current date: ${new Date().toISOString().split('T')[0]}.`
      },
      {
        role: 'user',
        content: `User query: "${query}"

Think step-by-step:
1. What is the user really looking for?
2. What platforms would have the best results? (Google, YouTube, GitHub, Reddit, Spotify)
3. How should we refine this query for better results?
4. What search strategy would work best?

Respond in JSON format:
{
  "thoughts": [
    {"step": "Understanding intent", "reasoning": "...", "action": "..."},
    {"step": "Selecting platforms", "reasoning": "...", "action": "..."},
    {"step": "Refining query", "reasoning": "...", "action": "..."}
  ],
  "enhancedQuery": "improved search query",
  "suggestedPlatforms": ["platform1", "platform2"],
  "searchStrategy": "brief strategy description"
}`
      }
    ];

    try {
      const response = await provider.chat(messages, { temperature: 0.7, maxTokens: 1000 });

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          query,
          thoughts: result.thoughts || [],
          enhancedQuery: result.enhancedQuery || query,
          suggestedPlatforms: result.suggestedPlatforms || ['google'],
          searchStrategy: result.searchStrategy || 'Standard search'
        };
      }
    } catch (error) {
      console.error('Thinking process error:', error);
    }

    // Fallback to simple analysis
    return {
      query,
      thoughts: [
        {
          step: 'Analysis',
          reasoning: 'Processing your search query',
          action: 'Searching multiple platforms'
        }
      ],
      enhancedQuery: query,
      suggestedPlatforms: ['google', 'youtube'],
      searchStrategy: 'Multi-platform search'
    };
  }

  /**
   * Web search with AI synthesis (like Perplexity)
   */
  async searchWithAI(query: string, webResults: any[]): Promise<string> {
    const provider = this.getProvider();

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a helpful search assistant. Synthesize web search results into a clear, accurate answer.
Include relevant citations. Be concise but comprehensive. Current date: ${new Date().toISOString().split('T')[0]}.`
      },
      {
        role: 'user',
        content: `Query: "${query}"

Search Results:
${webResults.slice(0, 5).map((r, i) =>
  `[${i+1}] ${r.title}\n${r.description}\nSource: ${r.url}`
).join('\n\n')}

Provide a comprehensive answer to the query based on these results. Include [1], [2], etc. to cite sources.`
      }
    ];

    try {
      return await provider.chat(messages, { temperature: 0.3, maxTokens: 500 });
    } catch (error) {
      console.error('AI synthesis error:', error);
      return `Found ${webResults.length} results. See search results below for detailed information.`;
    }
  }

  /**
   * Enhanced result ranking with better AI
   */
  async rankResults(query: string, results: any[]): Promise<any[]> {
    if (!results || results.length === 0) {
      return [];
    }

    const provider = this.getProvider();

    try {
      // Process in batches
      const batchSize = 15;
      const batches = this.chunkArray(results, batchSize);
      const scoredResults: any[] = [];

      for (const batch of batches) {
        const messages: ChatMessage[] = [
          {
            role: 'system',
            content: 'Score search results for relevance to the query (0.0 to 1.0). Consider recency, authority, and relevance. Return ONLY a JSON array of scores.'
          },
          {
            role: 'user',
            content: `Query: "${query}"\n\nResults:\n${batch.map((r, i) =>
              `${i}. [${r.platform}] ${r.title}: ${(r.description || '').slice(0, 100)}`
            ).join('\n')}\n\nReturn scores as: [0.95, 0.82, ...]`
          }
        ];

        try {
          const response = await provider.chat(messages, { temperature: 0.2, maxTokens: 200 });
          const scores = this.extractJSON(response);

          batch.forEach((result, i) => {
            result.relevance_score = Array.isArray(scores) ? (scores[i] || 0.5) : 0.5;
            result.final_score = this.calculateFinalScore(result);
          });

          scoredResults.push(...batch);
        } catch (error) {
          console.error('Ranking error:', error);
          batch.forEach(result => {
            result.relevance_score = 0.5;
            result.final_score = this.calculateFinalScore(result);
          });
          scoredResults.push(...batch);
        }
      }

      return scoredResults.sort((a, b) => b.final_score - a.final_score);
    } catch (error) {
      console.error('Enhanced ranking error:', error);
      return results;
    }
  }

  /**
   * Generate AI summary with better models
   */
  async summarizeResults(query: string, results: any[]): Promise<string> {
    if (!results || results.length === 0) {
      return 'No results found.';
    }

    const provider = this.getProvider();
    const topResults = results.slice(0, 8);

    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'Summarize search results concisely (2-3 sentences). Be helpful and informative.'
        },
        {
          role: 'user',
          content: `Query: "${query}"\n\nTop results:\n${topResults.map(r =>
            `- [${r.platform}] ${r.title}: ${(r.description || '').slice(0, 100)}`
          ).join('\n')}\n\nProvide a brief, helpful summary.`
        }
      ];

      return await provider.chat(messages, { temperature: 0.7, maxTokens: 200 });
    } catch (error) {
      console.error('Summary error:', error);
      return `Found ${results.length} results across ${new Set(results.map(r => r.platform)).size} platforms.`;
    }
  }

  // Helper methods

  private extractJSON(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      return [];
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private calculateFinalScore(result: any): number {
    const weights = {
      relevance: 0.50,
      engagement: 0.30,
      freshness: 0.20
    };

    return (
      (result.relevance_score || 0.5) * weights.relevance +
      (result.engagement_score || 0.5) * weights.engagement +
      (result.freshness_score || 0.5) * weights.freshness
    );
  }

  /**
   * Get info about current provider
   */
  getCurrentProvider(): string {
    return this.getProvider().name;
  }

  /**
   * Check which providers are configured
   */
  getConfiguredProviders(): string[] {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isConfigured())
      .map(([name, provider]) => provider.name);
  }
}

// Export singleton
export const advancedAIService = new AdvancedAIService();
