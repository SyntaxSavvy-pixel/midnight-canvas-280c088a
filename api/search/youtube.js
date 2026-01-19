const axios = require('axios');

exports.default = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_SEARCH_API_KEY;

  if (!apiKey) {
    console.warn('YouTube API not configured');
    return res.status(200).json({
      results: [],
      message: 'YouTube API not configured'
    });
  }

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: apiKey,
        q: query,
        part: 'snippet',
        type: 'video',
        maxResults: 10
      }
    });

    const results = response.data.items?.map(item => ({
      id: item.id.videoId,
      platform: 'youtube',
      title: item.snippet.title,
      description: item.snippet.description,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails.medium.url,
      author: item.snippet.channelTitle,
      author_url: `https://www.youtube.com/channel/${item.snippet.channelId}`,
      published_at: item.snippet.publishedAt,
      metadata: {
        channelId: item.snippet.channelId
      }
    })) || [];

    res.status(200).json({ results });
  } catch (error) {
    console.error('YouTube search error:', error.message);
    res.status(500).json({
      error: 'YouTube search failed',
      message: error.message
    });
  }
};
