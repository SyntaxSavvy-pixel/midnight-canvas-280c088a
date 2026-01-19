/**
 * Perplexica Chat API Handler
 * Streaming AI chat with web search and sources
 */

const OpenAI = require('openai');
const { Readable } = require('stream');

// Initialize OpenAI client
const getOpenAI = () => {
  const apiKey = process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({ apiKey });
};

const { braveWebSearch } = require('./brave-search');

// Web search using Brave Search API
async function searchWeb(query) {
  try {
    const searchResults = await braveWebSearch(query, 5);
    return searchResults.results.map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
    }));
  } catch (error) {
    console.error('Search error:', error);
    // Return empty array on error
    return [];
  }
}

// Get system prompt based on optimization mode
function getSystemPrompt(mode, sources) {
  const sourcesText = sources.length > 0
    ? `\n\nWeb Search Results:\n${sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}\nURL: ${s.url}`).join('\n\n')}`
    : '';

  const basePrompt = `You are an AI assistant that provides helpful, accurate answers with citations. When referencing information from the search results, cite them using [1], [2], etc.${sourcesText}`;

  switch (mode) {
    case 'speed':
      return `${basePrompt}\n\nProvide concise, direct answers. Keep responses brief and to the point.`;
    case 'quality':
      return `${basePrompt}\n\nProvide comprehensive, well-researched answers. Think through the problem step by step. Include relevant details and context.`;
    case 'balanced':
    default:
      return `${basePrompt}\n\nProvide clear, informative answers with appropriate detail.`;
  }
}

// Get model and temperature based on optimization mode
function getModelConfig(mode) {
  switch (mode) {
    case 'speed':
      return { model: 'gpt-4o-mini', temperature: 0.3 };
    case 'quality':
      return { model: 'gpt-4o', temperature: 0.7 };
    case 'balanced':
    default:
      return { model: 'gpt-4o-mini', temperature: 0.5 };
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, optimizationMode = 'balanced', files = [], history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendSSE = (type, data) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    // Step 1: Web search
    sendSSE('thinking', { content: 'Searching the web for relevant information...' });
    const sources = await searchWeb(message);
    sendSSE('sources', { sources });

    // Step 2: Process files if any
    let filesContext = '';
    if (files.length > 0) {
      sendSSE('thinking', { content: 'Processing uploaded documents...' });
      filesContext = `\n\nUploaded Documents:\n${files.map(f => f.content).join('\n\n')}`;
    }

    // Step 3: Generate AI response
    sendSSE('thinking', { content: 'Generating response...' });

    const openai = getOpenAI();
    const config = getModelConfig(optimizationMode);
    const systemPrompt = getSystemPrompt(optimizationMode, sources) + filesContext;

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    // Stream the response
    const stream = await openai.chat.completions.create({
      model: config.model,
      messages,
      temperature: config.temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        sendSSE('content', { content });
      }
    }

    sendSSE('done', {});
    res.end();
  } catch (error) {
    console.error('Perplexica chat error:', error);

    // Send error through SSE if headers already sent
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = { default: handler };
