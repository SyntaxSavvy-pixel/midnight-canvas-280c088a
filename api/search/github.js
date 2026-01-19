const axios = require('axios');

exports.default = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const token = process.env.GITHUB_TOKEN;

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'TabKeep-Search'
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    const response = await axios.get('https://api.github.com/search/repositories', {
      params: {
        q: query,
        sort: 'stars',
        order: 'desc',
        per_page: 10
      },
      headers
    });

    const results = response.data.items?.map(item => ({
      id: item.id.toString(),
      platform: 'github',
      title: item.full_name,
      description: item.description || 'No description',
      url: item.html_url,
      thumbnail: item.owner.avatar_url,
      author: item.owner.login,
      author_url: item.owner.html_url,
      published_at: item.created_at,
      metadata: {
        stars: item.stargazers_count,
        language: item.language,
        forks: item.forks_count
      }
    })) || [];

    res.status(200).json({ results });
  } catch (error) {
    console.error('GitHub search error:', error.message);
    res.status(500).json({
      error: 'GitHub search failed',
      message: error.message
    });
  }
};
