const axios = require('axios');

exports.default = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const response = await axios.get('https://www.reddit.com/search.json', {
      params: {
        q: query,
        limit: 10,
        sort: 'relevance'
      },
      headers: {
        'User-Agent': 'TabKeep-Search/1.0'
      }
    });

    const results = response.data.data.children?.map(item => ({
      id: item.data.id,
      platform: 'reddit',
      title: item.data.title,
      description: item.data.selftext || item.data.url,
      url: `https://www.reddit.com${item.data.permalink}`,
      thumbnail: item.data.thumbnail !== 'self' && item.data.thumbnail !== 'default' ? item.data.thumbnail : null,
      author: item.data.author,
      author_url: `https://www.reddit.com/user/${item.data.author}`,
      published_at: new Date(item.data.created_utc * 1000).toISOString(),
      metadata: {
        subreddit: item.data.subreddit,
        score: item.data.score,
        num_comments: item.data.num_comments
      }
    })) || [];

    res.status(200).json({ results });
  } catch (error) {
    console.error('Reddit search error:', error.message);
    res.status(500).json({
      error: 'Reddit search failed',
      message: error.message
    });
  }
};
