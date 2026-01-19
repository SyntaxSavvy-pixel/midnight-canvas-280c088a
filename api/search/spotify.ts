/**
 * Spotify Web API Serverless Function
 * FREE - Rate limited
 *
 * Setup:
 * 1. Create app at developer.spotify.com/dashboard
 * 2. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to Vercel env vars
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

// Cache for Spotify access token
let spotifyAccessToken: string | null = null;
let tokenExpiry: number = 0;

async function getSpotifyAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (spotifyAccessToken && Date.now() < tokenExpiry) {
    return spotifyAccessToken;
  }

  // Request new token
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Spotify auth failed: ${data.error_description}`);
  }

  spotifyAccessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min before expiry

  return spotifyAccessToken;
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

    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Spotify credentials not configured' });
    }

    const startTime = Date.now();

    // Get Spotify access token
    const accessToken = await getSpotifyAccessToken();

    // Call Spotify Search API
    const apiUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,album,artist&limit=20`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (data.error) {
      console.error('Spotify API error:', data.error);
      return res.status(500).json({
        error: 'Spotify search failed',
        message: data.error.message
      });
    }

    // Normalize results (combine tracks, albums, artists)
    const results = normalizeSpotifyResults(data);
    const duration = Date.now() - startTime;

    // Save to database
    if (sessionId) {
      try {
        await supabase.from('platform_results').insert({
          session_id: sessionId,
          platform: 'spotify',
          normalized_results: results,
          result_count: results.length,
          duration_ms: duration
        });
      } catch (dbError) {
        console.error('Database save error:', dbError);
      }
    }

    return res.status(200).json({
      platform: 'spotify',
      results,
      count: results.length,
      duration
    });

  } catch (error: any) {
    console.error('Spotify search error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

function normalizeSpotifyResults(data: any): NormalizedResult[] {
  const results: NormalizedResult[] = [];

  // Add tracks
  const tracks = data.tracks?.items || [];
  tracks.slice(0, 10).forEach((track: any, index: number) => {
    const popularityScore = (track.popularity || 0) / 100; // 0-100 to 0-1

    results.push({
      id: `spotify-track-${track.id}`,
      platform: 'spotify',
      title: track.name || 'Untitled Track',
      description: `Track by ${track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}`,
      url: track.external_urls?.spotify || '',
      thumbnail: track.album?.images?.[0]?.url,
      author: track.artists?.[0]?.name || 'Unknown Artist',
      author_url: track.artists?.[0]?.external_urls?.spotify,
      published_at: track.album?.release_date,
      engagement_score: popularityScore,
      engagement_raw: {
        popularity: track.popularity || 0,
        duration_ms: track.duration_ms || 0
      },
      relevance_score: 0.5,
      freshness_score: 0.6,
      quality_score: 0.8,
      final_score: 0.5,
      extras: {
        type: 'track',
        albumName: track.album?.name,
        previewUrl: track.preview_url,
        explicit: track.explicit,
        trackNumber: track.track_number
      }
    });
  });

  // Add albums
  const albums = data.albums?.items || [];
  albums.slice(0, 5).forEach((album: any) => {
    const popularityScore = (album.popularity || 50) / 100;

    results.push({
      id: `spotify-album-${album.id}`,
      platform: 'spotify',
      title: album.name || 'Untitled Album',
      description: `Album by ${album.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}`,
      url: album.external_urls?.spotify || '',
      thumbnail: album.images?.[0]?.url,
      author: album.artists?.[0]?.name || 'Unknown Artist',
      author_url: album.artists?.[0]?.external_urls?.spotify,
      published_at: album.release_date,
      engagement_score: popularityScore,
      engagement_raw: {
        totalTracks: album.total_tracks || 0
      },
      relevance_score: 0.5,
      freshness_score: 0.6,
      quality_score: 0.8,
      final_score: 0.5,
      extras: {
        type: 'album',
        releaseDate: album.release_date,
        releaseDatePrecision: album.release_date_precision
      }
    });
  });

  // Add artists
  const artists = data.artists?.items || [];
  artists.slice(0, 5).forEach((artist: any) => {
    const popularityScore = (artist.popularity || 50) / 100;

    results.push({
      id: `spotify-artist-${artist.id}`,
      platform: 'spotify',
      title: artist.name || 'Untitled Artist',
      description: `${artist.genres?.join(', ') || 'Artist'} • ${artist.followers?.total?.toLocaleString() || 0} followers`,
      url: artist.external_urls?.spotify || '',
      thumbnail: artist.images?.[0]?.url,
      author: artist.name || 'Unknown Artist',
      author_url: artist.external_urls?.spotify,
      engagement_score: popularityScore,
      engagement_raw: {
        followers: artist.followers?.total || 0,
        popularity: artist.popularity || 0
      },
      relevance_score: 0.5,
      freshness_score: 0.5,
      quality_score: 0.8,
      final_score: 0.5,
      extras: {
        type: 'artist',
        genres: artist.genres || []
      }
    };
  });

  return results;
}
