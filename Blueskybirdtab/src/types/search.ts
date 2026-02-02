/**
 * Multi-Platform Search Type Definitions
 *
 * Defines all types for the search feature including platforms,
 * normalized results, search sessions, and platform-specific data
 */

// ============================================
// PLATFORM TYPES
// ============================================

/**
 * Supported search platforms
 * GREEN TIER (Free APIs only)
 */
export type Platform = 'google' | 'youtube' | 'github' | 'reddit' | 'spotify';

/**
 * Platform metadata for UI display
 */
export interface PlatformMetadata {
  id: Platform;
  name: string;
  icon: string;
  color: string;
  description: string;
}

// ============================================
// NORMALIZED RESULT FORMAT
// ============================================

/**
 * Universal result format for all platforms
 * All platform-specific results are normalized to this structure
 */
export interface NormalizedResult {
  // Core identification
  id: string;
  platform: Platform;

  // Content fields
  title: string;
  description: string;
  url: string;
  thumbnail?: string;

  // Metadata
  author: string;
  author_url?: string;
  published_at?: string;  // ISO 8601 format

  // Engagement metrics (normalized to 0-1 scale)
  engagement_score: number;  // Normalized popularity score
  engagement_raw?: {
    views?: number;
    likes?: number;
    stars?: number;
    upvotes?: number;
    comments?: number;
    shares?: number;
  };

  // AI-powered scores
  relevance_score: number;   // 0-1, determined by AI based on query
  freshness_score: number;   // 0-1, based on recency (newer = higher)
  quality_score: number;     // 0-1, platform-specific quality metric
  final_score: number;       // Weighted combination of above scores

  // Platform-specific additional data
  extras?: Record<string, any>;
}

// ============================================
// SEARCH SESSION TYPES
// ============================================

/**
 * Search session status states
 */
export type SearchStatus = 'pending' | 'searching' | 'completed' | 'failed';

/**
 * Search session - represents a single search query
 */
export interface SearchSession {
  id: string;
  user_id: string;

  // Query data
  initial_query: string;
  refined_query?: string;

  // Platform selection
  selected_platforms: Platform[];
  platforms_searched: Platform[];

  // Status
  status: SearchStatus;

  // Results
  ai_summary?: string;
  total_results: number;

  // Timestamps
  created_at: string;  // ISO 8601
  completed_at?: string;  // ISO 8601
}

/**
 * Platform-specific search result container
 */
export interface PlatformResult {
  platform: Platform;
  results: NormalizedResult[];
  duration: number;  // milliseconds
  error?: string;
}

// ============================================
// SEARCH REQUEST/RESPONSE TYPES
// ============================================

/**
 * Request body for platform search API
 */
export interface SearchRequest {
  query: string;
  sessionId?: string;
  options?: SearchOptions;
}

/**
 * Search options for filtering/customization
 */
export interface SearchOptions {
  maxResults?: number;
  sortBy?: 'relevance' | 'date' | 'popularity';
  dateRange?: {
    start?: string;
    end?: string;
  };
}

/**
 * Response from platform search API
 */
export interface SearchResponse {
  platform: Platform;
  results: NormalizedResult[];
  count: number;
  duration?: number;
  error?: string;
}

// ============================================
// AI CLARIFICATION TYPES
// ============================================

/**
 * AI-generated clarifying question
 */
export interface ClarificationQuestion {
  question: string;
  options: string[];
}

/**
 * AI search intent analysis
 */
export interface SearchIntent {
  intent: string;  // e.g., "learn", "find_content", "compare"
  contentTypes: string[];  // e.g., ["videos", "tutorials", "articles"]
  suggestedPlatforms: Platform[];
  confidence: number;  // 0-1
}

// ============================================
// UI STATE TYPES
// ============================================

/**
 * Search mode state
 */
export type SearchMode = 'chat' | 'search';

/**
 * Platform filter state
 */
export interface PlatformFilter {
  platform: Platform;
  enabled: boolean;
}

/**
 * Search UI state
 */
export interface SearchUIState {
  mode: SearchMode;
  selectedPlatforms: Platform[];
  activeTab: Platform | 'all';
  isSearching: boolean;
  showClarifications: boolean;
}

// ============================================
// DATABASE RECORD TYPES
// ============================================

/**
 * Database record for search_sessions table
 */
export interface SearchSessionRecord {
  id: string;
  user_id: string;
  initial_query: string;
  refined_query: string | null;
  selected_platforms: string[];
  platforms_searched: string[];
  status: SearchStatus;
  ai_summary: string | null;
  total_results: number;
  created_at: string;
  completed_at: string | null;
}

/**
 * Database record for platform_results table
 */
export interface PlatformResultRecord {
  id: string;
  session_id: string;
  platform: string;
  normalized_results: any;  // JSONB
  result_count: number;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Result with loading state for progressive rendering
 */
export interface ResultWithState extends NormalizedResult {
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

/**
 * Grouped results by platform
 */
export interface GroupedResults {
  [key: string]: NormalizedResult[];  // key is Platform
}

/**
 * Search statistics
 */
export interface SearchStats {
  totalResults: number;
  platformCounts: Record<Platform, number>;
  averageRelevance: number;
  searchDuration: number;
  successfulPlatforms: number;
  failedPlatforms: number;
}
