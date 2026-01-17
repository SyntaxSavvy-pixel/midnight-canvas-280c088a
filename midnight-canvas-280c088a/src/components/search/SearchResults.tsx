/**
 * SearchResults Component
 *
 * Displays multi-platform search results with:
 * - AI thinking process (like Perplexity)
 * - AI summary
 * - Platform tabs (All, Google, YouTube, etc.)
 * - Result cards grid
 * - Loading and error states
 */

import { useState } from 'react';
import { Loader2, AlertCircle, Sparkles, Brain, Zap } from 'lucide-react';
import type { SearchSession, NormalizedResult, PlatformResult, Platform } from '@/types/search';
import type { SearchThought } from '@/services/ai/advanced-ai.service';
import ResultCard from './ResultCard';

interface SearchResultsProps {
  session: SearchSession | null;
  results: NormalizedResult[];
  platformResults: PlatformResult[];
  isSearching: boolean;
  isThinking?: boolean;
  thoughts?: SearchThought[];
  aiSummary?: string | null;
  error?: string | null;
  currentProvider?: string;
}

const SearchResults = ({
  session,
  results,
  platformResults,
  isSearching,
  isThinking = false,
  thoughts = [],
  aiSummary = null,
  error,
  currentProvider = 'AI'
}: SearchResultsProps) => {
  const [activeTab, setActiveTab] = useState<Platform | 'all'>('all');

  // Platform metadata
  const platformConfig: Record<Platform, { name: string; color: string }> = {
    google: { name: 'Google', color: 'bg-blue-500' },
    youtube: { name: 'YouTube', color: 'bg-red-500' },
    github: { name: 'GitHub', color: 'bg-gray-800' },
    reddit: { name: 'Reddit', color: 'bg-orange-500' },
    spotify: { name: 'Spotify', color: 'bg-green-500' }
  };

  // Filter results by active tab
  const filteredResults = activeTab === 'all'
    ? results
    : results.filter(r => r.platform === activeTab);

  // Calculate platform counts
  const platformCounts = results.reduce((acc, r) => {
    acc[r.platform] = (acc[r.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Thinking state (like Perplexity)
  if (isThinking && thoughts.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <Brain className="w-12 h-12 text-primary mb-6 animate-pulse" />
        <p className="text-lg text-foreground/80 mb-4">
          {currentProvider} is thinking...
        </p>

        {/* Thought Process */}
        <div className="w-full max-w-2xl space-y-3">
          {thoughts.map((thought, index) => (
            <div
              key={index}
              className="p-4 bg-secondary/30 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex items-start gap-3">
                <Zap className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {thought.step}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {thought.reasoning}
                  </p>
                  {thought.action && (
                    <p className="text-xs text-primary mt-1 italic">
                      → {thought.action}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          Analyzing your query and selecting the best search strategy...
        </p>
      </div>
    );
  }

  // Loading/Searching state
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-foreground/80">
          Searching across platforms...
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Using {currentProvider} to rank and analyze results
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-lg text-foreground/80 mb-2">
          Search failed
        </p>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          {error}
        </p>
      </div>
    );
  }

  // No results
  if (!session || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-lg text-foreground/80 mb-2">
          No results found
        </p>
        <p className="text-sm text-muted-foreground">
          Try a different search query or select more platforms
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* AI Summary with Source Info */}
      {(aiSummary || session?.ai_summary) && (
        <div className="p-6 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl border border-primary/20">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-primary">
                  AI Answer
                </h3>
                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
                  Powered by {currentProvider}
                </span>
              </div>
              <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {aiSummary || session?.ai_summary}
              </p>

              {/* Source Pills */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className="text-xs text-muted-foreground">Sources:</span>
                {Object.keys(platformCounts).map((platform) => {
                  const config = platformConfig[platform as Platform];
                  return (
                    <span
                      key={platform}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-secondary/50 text-foreground/70"
                    >
                      {config.name} ({platformCounts[platform]})
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Count - If no AI summary */}
      {!session.ai_summary && results.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">
            Found {results.length} results from {Object.keys(platformCounts).length} {Object.keys(platformCounts).length === 1 ? 'source' : 'sources'}
          </span>
          <div className="flex gap-2">
            {Object.keys(platformCounts).map((platform) => {
              const config = platformConfig[platform as Platform];
              return (
                <span
                  key={platform}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary/50"
                >
                  {config.name} ({platformCounts[platform]})
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Platform Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {/* All tab */}
        <button
          onClick={() => setActiveTab('all')}
          className={`
            px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium
            transition-all
            ${activeTab === 'all'
              ? 'bg-primary text-white shadow-lg'
              : 'bg-secondary/50 hover:bg-secondary text-foreground/70 hover:text-foreground'
            }
          `}
        >
          All ({results.length})
        </button>

        {/* Platform tabs */}
        {Object.entries(platformCounts).map(([platform, count]) => {
          const config = platformConfig[platform as Platform];
          return (
            <button
              key={platform}
              onClick={() => setActiveTab(platform as Platform)}
              className={`
                px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium
                transition-all
                ${activeTab === platform
                  ? `${config.color} text-white shadow-lg`
                  : 'bg-secondary/50 hover:bg-secondary text-foreground/70 hover:text-foreground'
                }
              `}
            >
              {config.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Results Grid - Single column for pill-shaped design */}
      <div className="flex flex-col gap-3">
        {filteredResults.map((result) => (
          <ResultCard key={result.id} result={result} />
        ))}
      </div>

      {/* No results for filtered tab */}
      {filteredResults.length === 0 && activeTab !== 'all' && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No results from {platformConfig[activeTab].name}
          </p>
        </div>
      )}

      {/* Platform Errors */}
      {platformResults.some(pr => pr.error) && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-500 mb-2">
            Some platforms failed
          </h4>
          <ul className="text-xs text-foreground/70 space-y-1">
            {platformResults
              .filter(pr => pr.error)
              .map(pr => (
                <li key={pr.platform}>
                  <span className="font-medium">{platformConfig[pr.platform].name}:</span> {pr.error}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
