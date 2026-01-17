/**
 * useMultiPlatformSearch Hook
 *
 * Orchestrates multi-platform search:
 * 1. Creates search session in DB
 * 2. Executes parallel searches across platforms
 * 3. Aggregates and normalizes results
 * 4. AI ranking and summarization
 * 5. Updates session with results
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { searchClient } from '@/services/search/search-client.service';
import { advancedAIService, SearchThought } from '@/services/ai/advanced-ai.service';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Platform,
  SearchSession,
  NormalizedResult,
  PlatformResult
} from '@/types/search';

export interface UseMultiPlatformSearchReturn {
  // State
  session: SearchSession | null;
  results: NormalizedResult[];
  platformResults: PlatformResult[];
  isSearching: boolean;
  isThinking: boolean;
  thoughts: SearchThought[];
  aiSummary: string | null;
  error: string | null;
  currentProvider: string;

  // Actions
  executeSearch: (query: string, platforms: Platform[]) => Promise<void>;
  clearResults: () => void;
}

export const useMultiPlatformSearch = (): UseMultiPlatformSearchReturn => {
  const { user } = useAuth();

  // State
  const [session, setSession] = useState<SearchSession | null>(null);
  const [results, setResults] = useState<NormalizedResult[]>([]);
  const [platformResults, setPlatformResults] = useState<PlatformResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thoughts, setThoughts] = useState<SearchThought[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentProvider] = useState(advancedAIService.getCurrentProvider());

  /**
   * Execute multi-platform search
   */
  const executeSearch = useCallback(async (
    query: string,
    platforms: Platform[]
  ) => {
    if (!user) {
      setError('Must be logged in to search');
      return;
    }

    if (!query.trim()) {
      setError('Query cannot be empty');
      return;
    }

    if (platforms.length === 0) {
      setError('Select at least one platform');
      return;
    }

    setIsSearching(true);
    setIsThinking(true);
    setError(null);
    setResults([]);
    setPlatformResults([]);
    setThoughts([]);
    setAiSummary(null);

    try {
      // Step 0: Intelligent "thinking" phase (like Perplexity)
      console.log('🧠 AI is thinking about your search...');
      const thinkingResult = await advancedAIService.thinkAboutSearch(query);
      setThoughts(thinkingResult.thoughts);
      setIsThinking(false);

      console.log('💡 Search strategy:', thinkingResult.searchStrategy);
      console.log('🎯 Enhanced query:', thinkingResult.enhancedQuery);
      console.log('📍 Suggested platforms:', thinkingResult.suggestedPlatforms);

      // Use AI-enhanced query and platforms if they improve the search
      const finalQuery = thinkingResult.enhancedQuery || query;
      const finalPlatforms = thinkingResult.suggestedPlatforms.length > 0
        ? thinkingResult.suggestedPlatforms.filter(p => platforms.includes(p as Platform)) as Platform[]
        : platforms;

      // If AI suggested platforms not in user's selection, use user's original selection
      const searchPlatforms = finalPlatforms.length > 0 ? finalPlatforms : platforms;
      // Step 1: Create search session in database
      const { data: sessionData, error: sessionError } = await supabase
        .from('search_sessions')
        .insert({
          user_id: user.id,
          initial_query: query,
          selected_platforms: searchPlatforms,
          status: 'searching'
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error(`Failed to create search session: ${sessionError.message}`);
      }

      setSession(sessionData as SearchSession);

      // Step 2: Execute parallel searches across all selected platforms
      console.log(`🔍 Searching ${searchPlatforms.length} platforms:`, searchPlatforms);
      const platformSearchResults = await searchClient.searchMultiplePlatforms(
        searchPlatforms,
        finalQuery,
        sessionData.id
      );

      setPlatformResults(platformSearchResults);

      // Step 3: Aggregate all results
      const allResults = platformSearchResults.flatMap(pr => pr.results);
      console.log(`Found ${allResults.length} total results`);

      if (allResults.length === 0) {
        // No results found
        await supabase
          .from('search_sessions')
          .update({
            status: 'completed',
            platforms_searched: platformSearchResults.map(pr => pr.platform),
            total_results: 0,
            ai_summary: 'No results found for your query.',
            completed_at: new Date().toISOString()
          })
          .eq('id', sessionData.id);

        setSession({
          ...sessionData,
          status: 'completed',
          platforms_searched: platformSearchResults.map(pr => pr.platform),
          total_results: 0,
          ai_summary: 'No results found for your query.'
        } as SearchSession);

        setIsSearching(false);
        return;
      }

      // Step 4: Enhanced AI ranking with GPT-4/Claude
      let rankedResults = allResults;
      try {
        console.log('🤖 AI ranking results with', currentProvider, '...');
        rankedResults = await advancedAIService.rankResults(query, allResults);
        console.log('✅ AI ranking complete');
      } catch (rankError) {
        console.error('AI ranking failed, using default sorting:', rankError);
        // Fallback: sort by engagement_score
        rankedResults = allResults.sort((a, b) => b.engagement_score - a.engagement_score);
      }

      setResults(rankedResults);

      // Step 5: Enhanced AI summarization with web synthesis
      let summary = `Found ${rankedResults.length} results across ${platformSearchResults.filter(pr => pr.results.length > 0).length} platforms.`;
      try {
        console.log('📝 Generating AI summary with', currentProvider, '...');

        // If we have good web results, synthesize an answer like Perplexity
        if (rankedResults.length > 0) {
          summary = await advancedAIService.searchWithAI(query, rankedResults);
        } else {
          summary = await advancedAIService.summarizeResults(query, rankedResults);
        }

        setAiSummary(summary);
        console.log('✅ AI summary complete');
      } catch (summaryError) {
        console.error('AI summarization failed, using default:', summaryError);
      }

      // Step 6: Update search session as completed
      const { error: updateError } = await supabase
        .from('search_sessions')
        .update({
          status: 'completed',
          platforms_searched: platformSearchResults.map(pr => pr.platform),
          total_results: rankedResults.length,
          ai_summary: summary,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionData.id);

      if (updateError) {
        console.error('Failed to update session:', updateError);
        // Don't fail the whole search if update fails
      }

      // Update local session state
      setSession({
        ...sessionData,
        status: 'completed',
        platforms_searched: platformSearchResults.map(pr => pr.platform),
        total_results: rankedResults.length,
        ai_summary: summary,
        completed_at: new Date().toISOString()
      } as SearchSession);

      console.log('Search complete!');

    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed');

      // Mark session as failed if it was created
      if (session) {
        await supabase
          .from('search_sessions')
          .update({ status: 'failed' })
          .eq('id', session.id);
      }
    } finally {
      setIsSearching(false);
      setIsThinking(false);
    }
  }, [user, session]);

  /**
   * Clear search results and state
   */
  const clearResults = useCallback(() => {
    setSession(null);
    setResults([]);
    setPlatformResults([]);
    setThoughts([]);
    setAiSummary(null);
    setError(null);
  }, []);

  return {
    // State
    session,
    results,
    platformResults,
    isSearching,
    isThinking,
    thoughts,
    aiSummary,
    error,
    currentProvider,

    // Actions
    executeSearch,
    clearResults
  };
};
