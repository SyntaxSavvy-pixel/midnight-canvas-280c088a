const axios = require('axios');

exports.default = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !engineId) {
    console.warn('Google Search API not configured');
    return res.status(200).json({
      results: [],
      message: 'Google Search API not configured'
    });
  }

  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: apiKey,
        cx: engineId,
        q: query,
        num: 10
      }
    });

    const results = response.data.items?.map(item => ({
      id: item.cacheId || item.link,
      platform: 'google',
      title: item.title,
      description: item.snippet,
      url: item.link,
      thumbnail: item.pagemap?.cse_thumbnail?.[0]?.src,
      author: item.displayLink,
      author_url: `https://${item.displayLink}`,
      published_at: null,
      metadata: {
        source: item.displayLink
      }
    })) || [];

    res.status(200).json({ results });
  } catch (error) {
    console.error('Google search error:', error.message);
    res.status(500).json({
      error: 'Google search failed',
      message: error.message
    });
  }
};
