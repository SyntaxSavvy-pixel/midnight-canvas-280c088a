/**
 * GitHub REST API Serverless Function
 * FREE - 5,000 requests/hour (authenticated)
 *
 * Setup:
 * 1. Create Personal Access Token at github.com/settings/tokens
 * 2. Add GITHUB_TOKEN to Vercel env vars
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

    if (!process.env.GITHUB_TOKEN) {
      return res.status(500).json({ error: 'GitHub token not configured' });
    }

    const startTime = Date.now();

    // Call GitHub Search API
    const apiUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TabKeep-Search'
      }
    });

    const data = await response.json();

    if (data.message) {
      console.error('GitHub API error:', data.message);
      return res.status(500).json({
        error: 'GitHub search failed',
        message: data.message
      });
    }

    // Normalize results
    const results = normalizeGitHubResults(data.items || []);
    const duration = Date.now() - startTime;

    // Save to database
    if (sessionId) {
      try {
        await supabase.from('platform_results').insert({
          session_id: sessionId,
          platform: 'github',
          normalized_results: results,
          result_count: results.length,
          duration_ms: duration
        });
      } catch (dbError) {
        console.error('Database save error:', dbError);
      }
    }

    return res.status(200).json({
      platform: 'github',
      results,
      count: results.length,
      duration
    });

  } catch (error: any) {
    console.error('GitHub search error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

function normalizeGitHubResults(items: any[]): NormalizedResult[] {
  return items.slice(0, 20).map((item, index) => {
    // Calculate engagement score based on stars
    const maxStars = 100000; // Normalize relative to 100K stars
    const engagementScore = Math.min(1, (item.stargazers_count || 0) / maxStars);

    // Calculate freshness score
    const updatedDate = new Date(item.updated_at);
    const daysSinceUpdate = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
    let freshnessScore = 0.5;
    if (daysSinceUpdate <= 30) freshnessScore = 1.0;
    else if (daysSinceUpdate <= 90) freshnessScore = 0.8;
    else if (daysSinceUpdate <= 180) freshnessScore = 0.6;
    else if (daysSinceUpdate <= 365) freshnessScore = 0.4;

    return {
      id: `github-${item.id}`,
      platform: 'github',
      title: item.full_name || 'Untitled Repository',
      description: item.description || 'No description available',
      url: item.html_url,
      thumbnail: item.owner?.avatar_url,
      author: item.owner?.login || 'Unknown',
      author_url: item.owner?.html_url,
      published_at: item.created_at,
      engagement_score: engagementScore,
      engagement_raw: {
        stars: item.stargazers_count || 0,
        forks: item.forks_count || 0,
        watchers: item.watchers_count || 0,
        issues: item.open_issues_count || 0
      },
      relevance_score: 0.5,
      freshness_score: freshnessScore,
      quality_score: 0.8,
      final_score: 0.5,
      extras: {
        language: item.language,
        topics: item.topics || [],
        license: item.license?.name,
        homepage: item.homepage,
        isArchived: item.archived,
        defaultBranch: item.default_branch
      }
    };
  });
}
