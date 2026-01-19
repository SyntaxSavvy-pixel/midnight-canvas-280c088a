/**
 * YouTube Data API v3 Serverless Function
 * FREE - 10,000 quota units/day (~100 searches)
 *
 * Setup:
 * 1. Enable YouTube Data API v3 in Google Cloud Console
 * 2. Create API credentials (API key)
 * 3. Add YOUTUBE_API_KEY to Vercel env vars
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

    if (!process.env.YOUTUBE_API_KEY) {
      return res.status(500).json({ error: 'YouTube API key not configured' });
    }

    const startTime = Date.now();

    // Call YouTube Data API
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(query)}&key=${process.env.YOUTUBE_API_KEY}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error);
      return res.status(500).json({
        error: 'YouTube search failed',
        message: data.error.message
      });
    }

    // Normalize results
    const results = normalizeYouTubeResults(data.items || []);
    const duration = Date.now() - startTime;

    // Save to database
    if (sessionId) {
      try {
        await supabase.from('platform_results').insert({
          session_id: sessionId,
          platform: 'youtube',
          normalized_results: results,
          result_count: results.length,
          duration_ms: duration
        });
      } catch (dbError) {
        console.error('Database save error:', dbError);
      }
    }

    return res.status(200).json({
      platform: 'youtube',
      results,
      count: results.length,
      duration
    });

  } catch (error: any) {
    console.error('YouTube search error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

function normalizeYouTubeResults(items: any[]): NormalizedResult[] {
  return items.slice(0, 20).map((item, index) => {
    const snippet = item.snippet || {};
    const videoId = item.id?.videoId || '';

    // Calculate freshness score
    const publishedDate = new Date(snippet.publishedAt);
    const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
    let freshnessScore = 0.5;
    if (daysSincePublished <= 7) freshnessScore = 1.0;
    else if (daysSincePublished <= 30) freshnessScore = 0.8;
    else if (daysSincePublished <= 90) freshnessScore = 0.6;
    else if (daysSincePublished <= 365) freshnessScore = 0.4;

    return {
      id: `youtube-${videoId}`,
      platform: 'youtube',
      title: snippet.title || 'Untitled Video',
      description: snippet.description || '',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      author: snippet.channelTitle || 'Unknown Channel',
      author_url: `https://www.youtube.com/channel/${snippet.channelId}`,
      published_at: snippet.publishedAt,
      engagement_score: Math.max(0, 1 - (index * 0.05)),
      engagement_raw: {
        position: index + 1
      },
      relevance_score: 0.5,
      freshness_score: freshnessScore,
      quality_score: 0.7,
      final_score: 0.5,
      extras: {
        videoId,
        channelId: snippet.channelId,
        liveBroadcastContent: snippet.liveBroadcastContent
      }
    };
  });
}
