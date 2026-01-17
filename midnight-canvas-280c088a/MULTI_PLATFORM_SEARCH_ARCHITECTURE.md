# Multi-Platform AI Search Architecture

## Executive Summary

Transform TabKeep into a powerful AI-driven search orchestrator that searches across 12+ platforms simultaneously, using safe, legal, and stable APIs.

**Core Philosophy:** Ship fast, stay legal, prioritize reliability over perfection.

---

## System Architecture Overview

```
┌─────────────┐
│   User UI   │ (React Frontend)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  AI Clarification Layer         │
│  - Intent detection             │
│  - Platform suggestions         │
│  - Query refinement             │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Search Orchestrator            │
│  - Parallel execution           │
│  - Timeout handling             │
│  - Result aggregation           │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Platform Service Layer         │
│  ├─ Google (SerpAPI)            │
│  ├─ YouTube (Official)          │
│  ├─ GitHub (Official)           │
│  ├─ Reddit (Official/SERP)      │
│  ├─ Spotify (Official)          │
│  ├─ TikTok (SERP)               │
│  ├─ Twitter/X (SERP)            │
│  ├─ Instagram (SERP)            │
│  ├─ LinkedIn (SERP)             │
│  ├─ Indeed (SERP)               │
│  ├─ Pinterest (SERP)            │
│  └─ Facebook (SERP)             │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  AI Ranking & Summarization     │
│  - Relevance scoring            │
│  - Content summarization        │
│  - Platform-specific weights    │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Normalized Results → UI        │
└─────────────────────────────────┘
```

---

## Integration Strategy by Platform

### 🟢 GREEN TIER (Official/Stable APIs) - IMPLEMENT FIRST

#### 1. **Google Search** - SerpAPI
- **API:** SerpAPI (https://serpapi.com)
- **Pricing:** $50/mo for 5,000 searches
- **Reliability:** 99.9% uptime
- **Why:** Industry standard, legal, stable
- **Implementation:**
```typescript
// services/search/google.service.ts
export class GoogleSearchService {
  async search(query: string, options: SearchOptions): Promise<NormalizedResult[]> {
    const response = await fetch(`https://serpapi.com/search.json?q=${query}&api_key=${API_KEY}`);
    return this.normalize(response.data.organic_results);
  }
}
```

#### 2. **YouTube** - Official API
- **API:** YouTube Data API v3
- **Pricing:** Free (10,000 units/day)
- **Quota:** ~100 searches/day with standard quotas
- **Why:** Direct from source, rich metadata
- **Implementation:**
```typescript
// services/search/youtube.service.ts
export class YouTubeSearchService {
  async search(query: string): Promise<NormalizedResult[]> {
    const response = await youtube.search.list({
      q: query,
      part: 'snippet',
      maxResults: 25,
      type: 'video'
    });
    return this.normalize(response.data.items);
  }
}
```

#### 3. **GitHub** - Official API
- **API:** GitHub REST API
- **Pricing:** Free (5,000 req/hour authenticated)
- **Why:** Developer-focused, great for code/repo searches
- **Implementation:**
```typescript
// services/search/github.service.ts
export class GitHubSearchService {
  async search(query: string, type: 'repositories' | 'code' | 'issues'): Promise<NormalizedResult[]> {
    const response = await octokit.search.repos({ q: query, per_page: 20 });
    return this.normalize(response.data.items);
  }
}
```

#### 4. **Reddit** - Official API + SERP Fallback
- **API:** Reddit API (PRAW-style wrapper)
- **Pricing:** Free
- **Rate Limit:** 60 req/min
- **Why:** Rich discussions, community insights
- **Implementation:**
```typescript
// services/search/reddit.service.ts
export class RedditSearchService {
  async search(query: string): Promise<NormalizedResult[]> {
    const response = await fetch(
      `https://www.reddit.com/search.json?q=${query}&limit=25`,
      { headers: { 'User-Agent': 'TabKeep/1.0' } }
    );
    return this.normalize(response.data.children);
  }
}
```

#### 5. **Spotify** - Official API
- **API:** Spotify Web API
- **Pricing:** Free
- **Why:** Music/podcast discovery
- **Implementation:**
```typescript
// services/search/spotify.service.ts
export class SpotifySearchService {
  async search(query: string, type: 'track' | 'playlist' | 'podcast'): Promise<NormalizedResult[]> {
    const response = await spotify.search(query, [type], { limit: 20 });
    return this.normalize(response[`${type}s`].items);
  }
}
```

---

### 🟡 YELLOW TIER (SERP-based) - IMPLEMENT SECOND

These platforms don't offer public search APIs, so we use **Google SERP with site: operators**.

#### 6-12. **TikTok, Twitter/X, Instagram, LinkedIn, Indeed, Pinterest, Facebook**

**Strategy:** Use SerpAPI with `site:` prefix
- `site:tiktok.com [query]`
- `site:x.com [query]`
- `site:instagram.com [query]`
- `site:linkedin.com [query]`
- `site:indeed.com [query]`
- `site:pinterest.com [query]`
- `site:facebook.com [query]`

**Implementation:**
```typescript
// services/search/serp-based.service.ts
export class SerpBasedSearchService {
  private platformDomains = {
    tiktok: 'tiktok.com',
    twitter: 'x.com',
    instagram: 'instagram.com',
    linkedin: 'linkedin.com',
    indeed: 'indeed.com',
    pinterest: 'pinterest.com',
    facebook: 'facebook.com'
  };

  async search(platform: string, query: string): Promise<NormalizedResult[]> {
    const domain = this.platformDomains[platform];
    const siteQuery = `site:${domain} ${query}`;

    const response = await fetch(
      `https://serpapi.com/search.json?q=${encodeURIComponent(siteQuery)}&api_key=${API_KEY}`
    );

    return this.normalize(response.data.organic_results, platform);
  }
}
```

**Why SERP over scraping:**
- ✅ Legal and ToS-compliant
- ✅ No account/IP bans
- ✅ Stable and maintained
- ✅ Industry-standard approach
- ❌ Slightly less precise (acceptable tradeoff)

---

### 🔴 RED TIER (Avoid) - NOT RECOMMENDED

**Do NOT implement by default:**
- Scraping (Puppeteer, Playwright, BeautifulSoup)
- Unofficial APIs (third-party wrappers)
- Headless browser automation

**Why avoid:**
- Legal gray area
- Account bans
- High maintenance
- Frequent breakage

**Exception:** Only mention as "advanced/experimental" features that users can optionally enable at their own risk.

---

## Database Schema Extensions

Add to existing Supabase schema:

```sql
-- Search sessions table
CREATE TABLE search_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  initial_query TEXT NOT NULL,
  refined_query TEXT,
  clarifications JSONB DEFAULT '[]'::jsonb,
  platforms TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Platform results table (for caching and analytics)
CREATE TABLE platform_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES search_sessions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  raw_results JSONB NOT NULL,
  normalized_results JSONB NOT NULL,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_search_sessions_user_id ON search_sessions(user_id);
CREATE INDEX idx_search_sessions_created_at ON search_sessions(created_at DESC);
CREATE INDEX idx_platform_results_session_id ON platform_results(session_id);
CREATE INDEX idx_platform_results_platform ON platform_results(platform);

-- RLS policies
ALTER TABLE search_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own searches" ON search_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create searches" ON search_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own results" ON platform_results
  FOR SELECT USING (
    session_id IN (SELECT id FROM search_sessions WHERE user_id = auth.uid())
  );
```

---

## Normalized Result Schema

**Universal format for all platforms:**

```typescript
// types/search.ts
export interface NormalizedResult {
  // Core fields
  id: string;                    // Unique identifier
  platform: Platform;            // Source platform

  // Content
  title: string;                 // Main heading
  description: string;           // Summary/snippet
  url: string;                   // Direct link
  thumbnail?: string;            // Image/video preview

  // Metadata
  author: string;                // Creator/publisher
  author_url?: string;           // Author profile
  published_at?: string;         // ISO timestamp

  // Engagement (normalized to 0-1 scale)
  engagement_score: number;      // Likes, views, etc.
  engagement_raw?: {             // Original metrics
    likes?: number;
    views?: number;
    comments?: number;
    shares?: number;
  };

  // AI scoring
  relevance_score: number;       // 0-1, AI-determined
  freshness_score: number;       // 0-1, recency-based
  quality_score: number;         // 0-1, platform-specific
  final_score: number;           // Weighted combination

  // Platform-specific extras (optional)
  extras?: Record<string, any>;
}

export type Platform =
  | 'google'
  | 'youtube'
  | 'github'
  | 'reddit'
  | 'spotify'
  | 'tiktok'
  | 'twitter'
  | 'instagram'
  | 'linkedin'
  | 'indeed'
  | 'pinterest'
  | 'facebook';
```

---

## AI Integration Strategy

### 1. **Clarification System** (Replit-style)

Use OpenAI GPT-4 or Claude to analyze user intent and ask smart questions.

```typescript
// services/ai/clarification.service.ts
export class ClarificationService {
  async analyzeIntent(query: string): Promise<Clarification> {
    const prompt = `
      User query: "${query}"

      Analyze this search query and determine:
      1. Primary intent (find content, learn, compare, job search, etc.)
      2. Content type preference (videos, articles, code, music, jobs, etc.)
      3. Suggested platforms (rank by relevance)
      4. 2-3 clarifying questions to improve results

      Return JSON format:
      {
        "intent": "string",
        "content_types": ["video", "article"],
        "suggested_platforms": ["youtube", "reddit", "github"],
        "questions": [
          {
            "question": "Are you looking for tutorials or entertainment?",
            "options": ["tutorials", "entertainment", "both"]
          }
        ]
      }
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  }
}
```

### 2. **Result Ranking System**

AI-powered scoring based on relevance, engagement, and freshness.

```typescript
// services/ai/ranking.service.ts
export class RankingService {
  async scoreResults(query: string, results: NormalizedResult[]): Promise<NormalizedResult[]> {
    // Batch process for efficiency
    const batches = chunk(results, 20);
    const scoredResults = [];

    for (const batch of batches) {
      const prompt = `
        Query: "${query}"

        Score these results for relevance (0-1):
        ${batch.map((r, i) => `${i}. ${r.title} - ${r.description}`).join('\n')}

        Return array of scores: [0.95, 0.82, ...]
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Cheaper for bulk scoring
        messages: [{ role: 'user', content: prompt }]
      });

      const scores = JSON.parse(response.choices[0].message.content);
      batch.forEach((result, i) => {
        result.relevance_score = scores[i];
        result.final_score = this.calculateFinalScore(result);
      });

      scoredResults.push(...batch);
    }

    return scoredResults.sort((a, b) => b.final_score - a.final_score);
  }

  private calculateFinalScore(result: NormalizedResult): number {
    // Weighted combination
    return (
      result.relevance_score * 0.50 +      // 50% relevance
      result.engagement_score * 0.30 +     // 30% popularity
      result.freshness_score * 0.20        // 20% recency
    );
  }
}
```

### 3. **Summarization System**

Generate concise summaries of aggregated results.

```typescript
// services/ai/summarization.service.ts
export class SummarizationService {
  async summarizeResults(query: string, results: NormalizedResult[]): Promise<string> {
    const topResults = results.slice(0, 10);

    const prompt = `
      Query: "${query}"

      Top 10 results across platforms:
      ${topResults.map(r => `- [${r.platform}] ${r.title}: ${r.description}`).join('\n')}

      Provide a concise 2-3 sentence summary of what the user will find.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150
    });

    return response.choices[0].message.content;
  }
}
```

---

## Search Orchestrator Implementation

The core system that coordinates parallel searches.

```typescript
// services/orchestrator/search-orchestrator.service.ts
export class SearchOrchestrator {
  private services: Map<Platform, BaseSearchService>;
  private clarificationService: ClarificationService;
  private rankingService: RankingService;
  private summarizationService: SummarizationService;

  constructor() {
    this.services = new Map([
      ['google', new GoogleSearchService()],
      ['youtube', new YouTubeSearchService()],
      ['github', new GitHubSearchService()],
      ['reddit', new RedditSearchService()],
      ['spotify', new SpotifySearchService()],
      ['tiktok', new SerpBasedSearchService('tiktok')],
      ['twitter', new SerpBasedSearchService('twitter')],
      ['instagram', new SerpBasedSearchService('instagram')],
      ['linkedin', new SerpBasedSearchService('linkedin')],
      ['indeed', new SerpBasedSearchService('indeed')],
      ['pinterest', new SerpBasedSearchService('pinterest')],
      ['facebook', new SerpBasedSearchService('facebook')],
    ]);
  }

  async orchestrateSearch(
    userId: string,
    query: string,
    selectedPlatforms?: Platform[]
  ): Promise<SearchSession> {
    // 1. Create search session
    const session = await this.createSession(userId, query);

    try {
      // 2. Get AI clarification (if not already refined)
      const clarification = await this.clarificationService.analyzeIntent(query);

      // 3. Determine which platforms to search
      const platforms = selectedPlatforms || clarification.suggested_platforms;

      // 4. Execute parallel searches with timeout
      const searchPromises = platforms.map(platform =>
        this.executeSearch(session.id, platform, query)
          .catch(error => ({ platform, error: error.message, results: [] }))
      );

      const platformResults = await Promise.allSettled(
        searchPromises.map(p =>
          Promise.race([
            p,
            this.timeout(10000, `${p} timeout`) // 10s per platform
          ])
        )
      );

      // 5. Aggregate and normalize results
      const allResults: NormalizedResult[] = [];
      for (const result of platformResults) {
        if (result.status === 'fulfilled' && result.value.results) {
          allResults.push(...result.value.results);
        }
      }

      // 6. AI ranking
      const rankedResults = await this.rankingService.scoreResults(query, allResults);

      // 7. Generate summary
      const summary = await this.summarizationService.summarizeResults(query, rankedResults);

      // 8. Save and return
      await this.completeSession(session.id, {
        results: rankedResults,
        summary,
        platforms_searched: platforms,
        total_results: rankedResults.length
      });

      return {
        ...session,
        results: rankedResults,
        summary
      };

    } catch (error) {
      await this.failSession(session.id, error.message);
      throw error;
    }
  }

  private async executeSearch(
    sessionId: string,
    platform: Platform,
    query: string
  ): Promise<{ platform: Platform; results: NormalizedResult[] }> {
    const startTime = Date.now();
    const service = this.services.get(platform);

    if (!service) {
      throw new Error(`No service configured for ${platform}`);
    }

    try {
      const results = await service.search(query);
      const duration = Date.now() - startTime;

      // Cache results in database
      await supabase.from('platform_results').insert({
        session_id: sessionId,
        platform,
        normalized_results: results,
        duration_ms: duration
      });

      return { platform, results };
    } catch (error) {
      // Log error but don't fail entire search
      await supabase.from('platform_results').insert({
        session_id: sessionId,
        platform,
        error: error.message,
        normalized_results: []
      });

      throw error;
    }
  }

  private timeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    );
  }
}
```

---

## Backend API Routes

Add to your Next.js API routes or Nest.js backend:

```typescript
// API Routes Structure

POST /api/search/initialize
Body: { query: string }
Response: { session_id, clarifications, suggested_platforms }

POST /api/search/execute
Body: { session_id, refined_query?, selected_platforms[] }
Response: { session_id, status: 'processing' }

GET /api/search/results/:session_id
Response: {
  status: 'completed' | 'processing' | 'failed',
  results: NormalizedResult[],
  summary: string,
  platforms_searched: Platform[]
}

GET /api/search/history
Response: { sessions: SearchSession[] }
```

### Example Implementation (Next.js App Router)

```typescript
// app/api/search/execute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SearchOrchestrator } from '@/services/orchestrator/search-orchestrator.service';

export async function POST(request: NextRequest) {
  const { session_id, refined_query, selected_platforms } = await request.json();
  const userId = request.headers.get('x-user-id'); // From auth middleware

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orchestrator = new SearchOrchestrator();

  // Start async search (don't await)
  orchestrator.orchestrateSearch(userId, refined_query, selected_platforms)
    .catch(error => console.error('Search failed:', error));

  return NextResponse.json({
    session_id,
    status: 'processing',
    message: 'Search started. Poll /api/search/results/:session_id for updates.'
  });
}
```

---

## Frontend Updates

### 1. **Enhanced Search Input Component**

```typescript
// components/EnhancedSearchBar.tsx
import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface ClarificationQuestion {
  question: string;
  options: string[];
}

export const EnhancedSearchBar = () => {
  const [query, setQuery] = useState('');
  const [clarifications, setClarifications] = useState<ClarificationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleInitialSearch = async () => {
    setIsAnalyzing(true);

    // Step 1: Get AI clarifications
    const response = await fetch('/api/search/initialize', {
      method: 'POST',
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    setClarifications(data.clarifications);
    setIsAnalyzing(false);
  };

  const handleExecuteSearch = async () => {
    // Step 2: Execute with refined query
    const response = await fetch('/api/search/execute', {
      method: 'POST',
      body: JSON.stringify({
        session_id: data.session_id,
        refined_query: query,
        clarifications: answers
      })
    });

    // Navigate to results page
    router.push(`/search/${data.session_id}`);
  };

  return (
    <div className="space-y-6">
      {/* Main search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across all platforms..."
          className="w-full px-6 py-4 text-lg rounded-2xl"
        />
        <button
          onClick={handleInitialSearch}
          disabled={!query || isAnalyzing}
          className="absolute right-2 top-2 px-6 py-2 bg-primary rounded-xl"
        >
          {isAnalyzing ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Search
            </>
          )}
        </button>
      </div>

      {/* AI Clarifications */}
      {clarifications.length > 0 && (
        <div className="space-y-4 p-6 bg-card rounded-2xl">
          <h3 className="font-medium">Help us refine your search:</h3>
          {clarifications.map((q, i) => (
            <div key={i}>
              <p className="text-sm text-muted-foreground mb-2">{q.question}</p>
              <div className="flex gap-2">
                {q.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => setAnswers({ ...answers, [i]: option })}
                    className={`px-4 py-2 rounded-lg ${
                      answers[i] === option
                        ? 'bg-primary text-white'
                        : 'bg-secondary'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={handleExecuteSearch}
            className="w-full py-3 bg-primary text-white rounded-xl mt-4"
          >
            Search with these preferences
          </button>
        </div>
      )}
    </div>
  );
};
```

### 2. **Results Display Component**

```typescript
// components/SearchResults.tsx
import { useState } from 'react';
import { Platform, NormalizedResult } from '@/types/search';

const platformColors: Record<Platform, string> = {
  youtube: 'bg-red-500',
  github: 'bg-gray-800',
  reddit: 'bg-orange-500',
  twitter: 'bg-blue-400',
  tiktok: 'bg-black',
  spotify: 'bg-green-500',
  // ... etc
};

export const SearchResults = ({ results, summary }: SearchResultsProps) => {
  const [activeTab, setActiveTab] = useState<Platform | 'all'>('all');

  const platformCounts = results.reduce((acc, r) => {
    acc[r.platform] = (acc[r.platform] || 0) + 1;
    return acc;
  }, {} as Record<Platform, number>);

  const filteredResults = activeTab === 'all'
    ? results
    : results.filter(r => r.platform === activeTab);

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      <div className="p-6 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl">
        <h2 className="text-lg font-medium mb-2">Summary</h2>
        <p className="text-foreground/80">{summary}</p>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            activeTab === 'all' ? 'bg-primary text-white' : 'bg-secondary'
          }`}
        >
          All Results ({results.length})
        </button>

        {Object.entries(platformCounts).map(([platform, count]) => (
          <button
            key={platform}
            onClick={() => setActiveTab(platform as Platform)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeTab === platform
                ? platformColors[platform] + ' text-white'
                : 'bg-secondary'
            }`}
          >
            {platform} ({count})
          </button>
        ))}
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResults.map((result) => (
          <ResultCard key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
};

const ResultCard = ({ result }: { result: NormalizedResult }) => (
  <a
    href={result.url}
    target="_blank"
    rel="noopener noreferrer"
    className="block p-4 bg-card rounded-xl hover:bg-card/80 transition-all group"
  >
    {result.thumbnail && (
      <img
        src={result.thumbnail}
        alt={result.title}
        className="w-full h-40 object-cover rounded-lg mb-3"
      />
    )}

    <div className="flex items-center gap-2 mb-2">
      <span className={`text-xs px-2 py-1 rounded ${platformColors[result.platform]} text-white`}>
        {result.platform}
      </span>
      <span className="text-xs text-muted-foreground">
        {result.author}
      </span>
    </div>

    <h3 className="font-medium mb-1 group-hover:text-primary transition-colors">
      {result.title}
    </h3>

    <p className="text-sm text-muted-foreground line-clamp-2">
      {result.description}
    </p>

    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
      {result.engagement_raw?.views && (
        <span>{formatNumber(result.engagement_raw.views)} views</span>
      )}
      {result.published_at && (
        <span>{formatDate(result.published_at)}</span>
      )}
      <span className="ml-auto">
        Score: {(result.final_score * 100).toFixed(0)}%
      </span>
    </div>
  </a>
);
```

---

## Implementation Phases

### **Phase 1: Foundation (Week 1)**
✅ Database schema
✅ Base service architecture
✅ Green tier APIs (Google, YouTube, GitHub, Reddit, Spotify)
✅ Normalized result format
✅ Basic orchestrator

### **Phase 2: AI Integration (Week 2)**
✅ OpenAI/Claude integration
✅ Clarification system
✅ Ranking algorithm
✅ Summarization

### **Phase 3: Yellow Tier Platforms (Week 3)**
✅ SERP-based services
✅ TikTok, Twitter, Instagram, LinkedIn, Indeed, Pinterest, Facebook
✅ Error handling and fallbacks

### **Phase 4: Frontend Enhancement (Week 4)**
✅ Enhanced search bar with clarifications
✅ Results display with platform tabs
✅ Loading states
✅ Search history integration

### **Phase 5: Optimization (Week 5)**
✅ Caching layer
✅ Rate limiting
✅ Performance monitoring
✅ Cost optimization

### **Phase 6: Polish & Launch (Week 6)**
✅ User testing
✅ Bug fixes
✅ Documentation
✅ Production deployment

---

## Cost Estimation (Monthly)

| Service | Tier | Est. Cost | Notes |
|---------|------|-----------|-------|
| SerpAPI | 5K searches/mo | $50 | Google + SERP platforms |
| OpenAI API | GPT-4 + 3.5 | $100-200 | Clarification + ranking |
| YouTube API | Free tier | $0 | 10K units/day |
| GitHub API | Free tier | $0 | Authenticated |
| Reddit API | Free tier | $0 | Rate-limited |
| Spotify API | Free tier | $0 | Standard access |
| Supabase | Pro tier | $25 | Database + auth |
| **Total** | | **$175-275/mo** | For ~5K searches |

**Revenue model:** Freemium
- Free: 10 searches/day
- Pro ($9.99/mo): 100 searches/day
- Enterprise ($29.99/mo): Unlimited

---

## Security & Compliance

### API Key Management
```typescript
// .env.production
SERPAPI_KEY=xxx
OPENAI_API_KEY=xxx
YOUTUBE_API_KEY=xxx
GITHUB_TOKEN=xxx
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx
```

### Rate Limiting
```typescript
// middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const searchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    const user = req.user;
    if (user.subscription === 'enterprise') return 1000;
    if (user.subscription === 'pro') return 100;
    return 10; // Free tier
  },
  message: 'Too many searches. Upgrade for more.',
});
```

### Data Privacy
- Never store API keys in frontend
- Encrypt sensitive data in database
- GDPR-compliant data deletion
- User consent for analytics

---

## Monitoring & Analytics

Track:
- Search volume per platform
- Success/failure rates per service
- Average response times
- AI clarification acceptance rate
- User satisfaction (result clicks)
- Cost per search

Use: Supabase Analytics, Sentry, or PostHog

---

## Next Steps

1. Review this architecture
2. Approve platform strategy (Green → Yellow → Red)
3. Set up API keys (SerpAPI, OpenAI, etc.)
4. Implement Phase 1 (Foundation)
5. Test with real searches
6. Iterate based on results

---

## FAQ

**Q: Why SerpAPI over direct scraping?**
A: Legal, stable, maintained. Scraping leads to bans and legal issues.

**Q: Can we add more platforms later?**
A: Yes! Modular design makes it easy to add new services.

**Q: What if a platform API goes down?**
A: Graceful degradation. Show results from working platforms.

**Q: How do we handle rate limits?**
A: Queue system + exponential backoff + user tier limits.

**Q: Can users pick which platforms to search?**
A: Yes! AI suggests, but users can override.

---

This architecture balances:
✅ **Speed** - Ship in 6 weeks
✅ **Safety** - No legal gray areas
✅ **Scalability** - Modular, async, cached
✅ **Practicality** - Uses industry-standard tools

Ready to implement? Let's start with Phase 1! 🚀
