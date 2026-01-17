/**
 * ResultCard Component - Pill-shaped design like Perplexity
 *
 * Individual search result with:
 * - Compact pill-shaped layout
 * - Inline source indicator
 * - Clean, minimalist design
 * - Hover effects
 */

import { ExternalLink, Star, Eye, ThumbsUp, GitFork, MessageSquare, Clock } from 'lucide-react';
import type { NormalizedResult, Platform } from '@/types/search';

interface ResultCardProps {
  result: NormalizedResult;
}

const ResultCard = ({ result }: ResultCardProps) => {
  // Platform colors (more subtle, pill-shaped)
  const platformColors: Record<Platform, { bg: string; text: string; border: string }> = {
    google: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    youtube: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
    github: { bg: 'bg-gray-50 dark:bg-gray-950/30', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-800' },
    reddit: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
    spotify: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' }
  };

  // Format numbers (1000 -> 1K)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format date (ISO to short)
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return '1d';
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    if (days < 365) return `${Math.floor(days / 30)}mo`;
    return `${Math.floor(days / 365)}y`;
  };

  // Get domain from URL
  const getDomain = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return '';
    }
  };

  const colors = platformColors[result.platform];

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="
        group block
        bg-card/50 hover:bg-card
        border border-border/30 hover:border-primary/40
        rounded-2xl overflow-hidden
        transition-all duration-200
        hover:shadow-lg hover:shadow-primary/5
      "
    >
      {/* Main Content */}
      <div className="p-4">
        {/* Top Row: Source Indicator + Metadata */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {/* Platform Pill Badge */}
          <span className={`
            inline-flex items-center gap-1.5 px-2.5 py-1
            rounded-full text-xs font-medium
            border ${colors.bg} ${colors.text} ${colors.border}
          `}>
            {result.platform.charAt(0).toUpperCase() + result.platform.slice(1)}
          </span>

          {/* Domain */}
          <span className="text-xs text-muted-foreground">
            {getDomain(result.url)}
          </span>

          {/* Date */}
          {result.published_at && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(result.published_at)}
              </span>
            </>
          )}

          {/* External Link Icon */}
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
        </div>

        {/* Title */}
        <h3 className="
          font-semibold text-base mb-1.5 line-clamp-2
          text-foreground group-hover:text-primary
          transition-colors
        ">
          {result.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {result.description}
        </p>

        {/* Bottom Row: Author + Engagement Metrics */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {/* Author */}
          {result.author && (
            <span className="font-medium">{result.author}</span>
          )}

          {/* Engagement Pills */}
          {result.engagement_raw?.stars !== undefined && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/50">
              <Star className="w-3 h-3" />
              {formatNumber(result.engagement_raw.stars)}
            </span>
          )}

          {result.engagement_raw?.views !== undefined && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/50">
              <Eye className="w-3 h-3" />
              {formatNumber(result.engagement_raw.views)}
            </span>
          )}

          {result.engagement_raw?.upvotes !== undefined && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/50">
              <ThumbsUp className="w-3 h-3" />
              {formatNumber(result.engagement_raw.upvotes)}
            </span>
          )}

          {result.engagement_raw?.forks !== undefined && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/50">
              <GitFork className="w-3 h-3" />
              {formatNumber(result.engagement_raw.forks)}
            </span>
          )}

          {result.engagement_raw?.comments !== undefined && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/50">
              <MessageSquare className="w-3 h-3" />
              {formatNumber(result.engagement_raw.comments)}
            </span>
          )}

          {/* Relevance Score Pill */}
          <span className="
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full
            bg-primary/10 text-primary font-medium ml-auto
          ">
            {Math.round(result.final_score * 100)}% match
          </span>
        </div>
      </div>

      {/* Thumbnail (Optional - shows only if available) */}
      {result.thumbnail && (
        <div className="h-32 border-t border-border/30 overflow-hidden bg-secondary/30">
          <img
            src={result.thumbnail}
            alt={result.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}
    </a>
  );
};

export default ResultCard;
