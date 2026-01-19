/**
 * Reddit JSON API Serverless Function
 * FREE - 60 requests/minute (no auth required)
 *
 * No setup required - uses public JSON API
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface NormalizedResult {
  id: string;
  platform: string;
  title: string;
  description: string;
  url: string;
  thumbnail?: string;
  author: string;
  author_url?: string;
  published_at?: string;
  engagement_score: number;
  engagement_raw?: Record<string, number>;
  relevance_score: number;
  freshness_score: number;
  quality_score: number;
  final_score: number;
  extras?: Record<string, any>;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Extract query
    const { query, sessionId } = req.body as { query?: string; sessionId?: string };
    if (!query?.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const startTime = Date.now();

    // Call Reddit JSON API
    const apiUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=25&sort=relevance`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'TabKeep-Search/1.0'
      }
    });

    const data = await response.json();

    if (data.error) {
      console.error('Reddit API error:', data.error);
      return res.status(500).json({
        error: 'Reddit search failed',
        message: data.message || 'Unknown error'
      });
    }

    // Normalize results
    const results = normalizeRedditResults(data.data?.children || []);
    const duration = Date.now() - startTime;

    // Save to database
    if (sessionId) {
      try {
        await supabase.from('platform_results').insert({
          session_id: sessionId,
          platform: 'reddit',
          normalized_results: results,
          result_count: results.length,
          duration_ms: duration
        });
      } catch (dbError) {
        console.error('Database save error:', dbError);
      }
    }

    return res.status(200).json({
      platform: 'reddit',
      results,
      count: results.length,
      duration
    });

  } catch (error: any) {
    console.error('Reddit search error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

function normalizeRedditResults(children: any[]): NormalizedResult[] {
  return children
    .filter(child => child.data && !child.data.over_18) // Filter NSFW
    .slice(0, 20)
    .map((child, index) => {
      const post = child.data;

      // Calculate engagement score based on upvotes
      const maxUpvotes = 10000; // Normalize relative to 10K upvotes
      const engagementScore = Math.min(1, Math.max(0, (post.score || 0) / maxUpvotes));

      // Calculate freshness score
      const createdTime = (post.created_utc || 0) * 1000; // Convert to milliseconds
      const hoursSinceCreated = (Date.now() - createdTime) / (1000 * 60 * 60);
      let freshnessScore = 0.5;
      if (hoursSinceCreated <= 24) freshnessScore = 1.0;
      else if (hoursSinceCreated <= 168) freshnessScore = 0.8; // 1 week
      else if (hoursSinceCreated <= 720) freshnessScore = 0.6; // 1 month
      else if (hoursSinceCreated <= 8760) freshnessScore = 0.4; // 1 year

      // Build post URL
      const postUrl = `https://www.reddit.com${post.permalink}`;

      // Extract thumbnail
      let thumbnail = post.thumbnail;
      if (thumbnail === 'self' || thumbnail === 'default' || !thumbnail?.startsWith('http')) {
        thumbnail = undefined;
      }

      return {
        id: `reddit-${post.id}`,
        platform: 'reddit',
        title: post.title || 'Untitled Post',
        description: post.selftext?.slice(0, 300) || `Posted in r/${post.subreddit}`,
        url: postUrl,
        thumbnail,
        author: post.author || 'Unknown',
        author_url: `https://www.reddit.com/user/${post.author}`,
        published_at: new Date(createdTime).toISOString(),
        engagement_score: engagementScore,
        engagement_raw: {
          upvotes: post.score || 0,
          comments: post.num_comments || 0,
          upvoteRatio: post.upvote_ratio || 0
        },
        relevance_score: 0.5,
        freshness_score: freshnessScore,
        quality_score: 0.7,
        final_score: 0.5,
        extras: {
          subreddit: post.subreddit,
          subredditUrl: `https://www.reddit.com/r/${post.subreddit}`,
          postHint: post.post_hint,
          isVideo: post.is_video,
          domain: post.domain
        }
      };
    });
}
