/**
 * Google Custom Search API Serverless Function
 * FREE - 100 queries/day
 *
 * Setup:
 * 1. Get API key from Google Cloud Console
 * 2. Create Custom Search Engine at programmablesearchengine.google.com
 * 3. Add GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID to Vercel env vars
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role key (server-side only)
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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Extract query from request body
    const { query, sessionId } = req.body as { query?: string; sessionId?: string };
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Check if API keys are configured
    if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
      return res.status(500).json({
        error: 'Google Custom Search API not configured',
        message: 'Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID environment variables'
      });
    }

    const startTime = Date.now();

    // Call Google Custom Search API
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    // Handle API errors
    if (data.error) {
      console.error('Google API error:', data.error);
      return res.status(500).json({
        error: 'Google search failed',
        message: data.error.message || 'Unknown error',
        details: data.error
      });
    }

    // Normalize results
    const results = normalizeGoogleResults(data.items || []);
    const duration = Date.now() - startTime;

    // Save results to database if sessionId provided
    if (sessionId) {
      try {
        await supabase.from('platform_results').insert({
          session_id: sessionId,
          platform: 'google',
          normalized_results: results,
          result_count: results.length,
          duration_ms: duration
        });
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Don't fail the request if DB save fails
      }
    }

    // Return normalized results
    return res.status(200).json({
      platform: 'google',
      results,
      count: results.length,
      duration
    });

  } catch (error: any) {
    console.error('Google search error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred'
    });
  }
}

/**
 * Normalize Google Custom Search results to common format
 */
function normalizeGoogleResults(items: any[]): NormalizedResult[] {
  return items.slice(0, 10).map((item, index) => {
    // Extract thumbnail if available
    const thumbnail = item.pagemap?.cse_thumbnail?.[0]?.src ||
                      item.pagemap?.cse_image?.[0]?.src;

    // Parse URL for author info
    let hostname = '';
    try {
      const urlObj = new URL(item.link);
      hostname = urlObj.hostname;
    } catch (e) {
      hostname = 'Unknown';
    }

    // Calculate scores
    const positionScore = Math.max(0, 1 - (index * 0.1)); // Top result = 1.0
    const freshnessScore = 0.7; // Google results are generally recent

    return {
      id: `google-${index}-${Date.now()}`,
      platform: 'google',
      title: item.title || 'Untitled',
      description: item.snippet || '',
      url: item.link,
      thumbnail,
      author: hostname,
      author_url: `https://${hostname}`,
      published_at: item.pagemap?.metatags?.[0]?.['article:published_time'],
      engagement_score: positionScore,
      engagement_raw: {
        position: index + 1
      },
      relevance_score: 0.5, // Will be set by AI ranking
      freshness_score: freshnessScore,
      quality_score: 0.8, // Google results generally high quality
      final_score: 0.5,
      extras: {
        displayLink: item.displayLink,
        formattedUrl: item.formattedUrl,
        htmlSnippet: item.htmlSnippet,
        htmlTitle: item.htmlTitle
      }
    };
  });
}
