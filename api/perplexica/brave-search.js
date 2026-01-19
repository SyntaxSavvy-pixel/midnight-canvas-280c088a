/**
 * Brave Search API Integration
 * Privacy-focused web search
 */

const axios = require('axios');

async function braveWebSearch(query, count = 10) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    console.warn('Brave Search API key not configured, using mock results');
    return getMockResults(query);
  }

  try {
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: query,
        count: count,
        search_lang: 'en',
        safesearch: 'moderate',
        text_decorations: true,
        spellcheck: true,
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    });

    const data = response.data;

    return {
      query: data.query?.original || query,
      results: (data.web?.results || []).map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.description || '',
        favicon: result.profile?.img || null,
        age: result.age || null,
      })),
      suggestions: data.query?.spellcheck_suggestions || [],
      infobox: data.infobox || null,
      news: (data.news?.results || []).slice(0, 3).map(n => ({
        title: n.title,
        url: n.url,
        snippet: n.description,
        source: n.meta_url?.hostname || '',
        thumbnail: n.thumbnail?.src || null,
        age: n.age,
      })),
    };
  } catch (error) {
    console.error('Brave Search API error:', error.response?.data || error.message);
    throw new Error(`Search failed: ${error.message}`);
  }
}

function getMockResults(query) {
  return {
    query,
    results: [
      {
        title: `Example Result for: ${query}`,
        url: 'https://example.com',
        snippet: 'This is a mock search result. Add your Brave Search API key to get real results.',
        favicon: null,
        age: null,
      },
      {
        title: 'Get Brave Search API Key',
        url: 'https://brave.com/search/api/',
        snippet: 'Sign up for Brave Search API to enable real web search. Free tier includes 2,000 queries per month.',
        favicon: null,
        age: null,
      },
    ],
    suggestions: [],
    infobox: null,
    news: [],
  };
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, count = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await braveWebSearch(query, count);
    res.json(results);
  } catch (error) {
    console.error('Search handler error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { default: handler, braveWebSearch };
