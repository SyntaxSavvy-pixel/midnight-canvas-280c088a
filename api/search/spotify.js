const axios = require('axios');

exports.default = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('Spotify API not configured');
    return res.status(200).json({
      results: [],
      message: 'Spotify API not configured'
    });
  }

  try {
    // Get Spotify access token
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Search Spotify
    const response = await axios.get('https://api.spotify.com/v1/search', {
      params: {
        q: query,
        type: 'track,album,artist',
        limit: 10
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const results = [];

    // Add tracks
    const tracks = response.data.tracks?.items || [];
    tracks.forEach(track => {
      results.push({
        id: `spotify-track-${track.id}`,
        platform: 'spotify',
        title: track.name,
        description: `Track by ${track.artists?.map(a => a.name).join(', ') || 'Unknown'}`,
        url: track.external_urls?.spotify,
        thumbnail: track.album?.images?.[0]?.url,
        author: track.artists?.[0]?.name || 'Unknown Artist',
        author_url: track.artists?.[0]?.external_urls?.spotify,
        published_at: track.album?.release_date,
        metadata: {
          type: 'track',
          album: track.album?.name,
          preview_url: track.preview_url
        }
      });
    });

    res.status(200).json({ results });
  } catch (error) {
    console.error('Spotify search error:', error.message);
    res.status(500).json({
      error: 'Spotify search failed',
      message: error.message
    });
  }
};
