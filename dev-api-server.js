/**
 * TabKeep Search Engine API Server
 * Combines Brave Search + ChatGPT for intelligent search results
 */

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config({ path: './midnight-canvas-280c088a/.env.local' });

const app = express();
const PORT = 3000;

// ============================================
// In-Memory Cache (TTL: 10 minutes)
// ============================================
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCacheKey(query, type = 'search') {
  return crypto.createHash('md5').update(`${type}:${query.toLowerCase().trim()}`).digest('hex');
}

function getFromCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[CACHE HIT] ${key}`);
    return cached.data;
  }
  if (cached) {
    cache.delete(key); // Expired
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  // Clean old entries periodically
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > CACHE_TTL) cache.delete(k);
    }
  }
}

// ============================================
// Middleware
// ============================================
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// Brave Search API (Web, Videos, Images)
// ============================================
async function braveSearch(query, count = 8, sourceFocus = 'all') {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    console.warn('[BRAVE] No API key configured');
    return { results: [], videos: [], images: [], cached: false };
  }

  // Check cache first
  const cacheKey = getCacheKey(`${query}:${sourceFocus}`, 'brave');
  const cached = getFromCache(cacheKey);
  if (cached) return { ...cached, cached: true };

  // Modify query based on source focus
  let searchQuery = query;
  if (sourceFocus === 'academic') {
    searchQuery = `${query} site:scholar.google.com OR site:arxiv.org OR site:researchgate.net OR site:academia.edu`;
  } else if (sourceFocus === 'news') {
    searchQuery = query; // Will use news endpoint
  } else if (sourceFocus === 'discussions') {
    searchQuery = `${query} site:reddit.com OR site:stackoverflow.com OR site:quora.com OR site:hackernews.com`;
  }

  try {
    // Fetch web, video, and image results in parallel
    const shouldFetchVideos = sourceFocus === 'all' || sourceFocus === 'videos';
    const shouldFetchImages = sourceFocus === 'all' || sourceFocus === 'images';
    const shouldFetchWeb = sourceFocus !== 'videos' && sourceFocus !== 'images';

    const searchPromises = [];

    // Web search
    if (shouldFetchWeb) {
      searchPromises.push(
        axios.get('https://api.search.brave.com/res/v1/web/search', {
          params: {
            q: searchQuery,
            count,
            search_lang: 'en',
            safesearch: 'moderate',
            text_decorations: false,
          },
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': apiKey,
          },
          timeout: 10000,
        })
      );
    } else {
      searchPromises.push(Promise.resolve({ data: {} }));
    }

    // Video search
    if (shouldFetchVideos) {
      searchPromises.push(
        axios.get('https://api.search.brave.com/res/v1/videos/search', {
          params: {
            q: query,
            count: sourceFocus === 'videos' ? 12 : 6,
            safesearch: 'moderate',
          },
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': apiKey,
          },
          timeout: 10000,
        })
      );
    } else {
      searchPromises.push(Promise.resolve({ data: {} }));
    }

    // Image search
    if (shouldFetchImages) {
      searchPromises.push(
        axios.get('https://api.search.brave.com/res/v1/images/search', {
          params: {
            q: query,
            count: sourceFocus === 'images' ? 12 : 6,
            safesearch: 'moderate',
          },
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': apiKey,
          },
          timeout: 10000,
        })
      );
    } else {
      searchPromises.push(Promise.resolve({ data: {} }));
    }

    const [webResponse, videoResponse, imageResponse] = await Promise.allSettled(searchPromises);

    // Process web results
    const webData = webResponse.status === 'fulfilled' ? webResponse.value.data : {};
    const webResults = (webData.web?.results || []).map((r, idx) => ({
      position: idx + 1,
      title: r.title,
      url: r.url,
      snippet: r.description || '',
      domain: new URL(r.url).hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=32`,
    }));

    // Process video results
    const videoData = videoResponse.status === 'fulfilled' ? videoResponse.value.data : {};
    const videos = (videoData.results || []).slice(0, 6).map(v => ({
      title: v.title,
      url: v.url,
      thumbnail: v.thumbnail?.src || null,
      duration: v.video?.duration || null,
      publisher: v.meta_url?.hostname || '',
      views: v.video?.views || null,
      age: v.age,
      isYouTube: v.url?.includes('youtube.com') || v.url?.includes('youtu.be'),
    }));

    // Process image results
    const imageData = imageResponse.status === 'fulfilled' ? imageResponse.value.data : {};
    const images = (imageData.results || []).slice(0, 6).map(img => ({
      title: img.title,
      url: img.url,
      thumbnail: img.thumbnail?.src || img.properties?.url || null,
      source: img.source,
      width: img.properties?.width,
      height: img.properties?.height,
    }));

    // Process news
    const news = (webData.news?.results || []).slice(0, 3).map(n => ({
      title: n.title,
      url: n.url,
      snippet: n.description,
      source: n.meta_url?.hostname || '',
      thumbnail: n.thumbnail?.src || null,
      age: n.age,
    }));

    const results = {
      query: webData.query?.original || query,
      results: webResults,
      videos,
      images,
      news,
      totalResults: webData.web?.results?.length || 0,
      searchTime: Date.now(),
    };

    setCache(cacheKey, results);
    console.log(`[BRAVE] Found ${webResults.length} web, ${videos.length} videos, ${images.length} images`);
    return { ...results, cached: false };
  } catch (error) {
    console.error('[BRAVE] Search error:', error.message);
    return { results: [], videos: [], images: [], error: error.message, cached: false };
  }
}

// ============================================
// ChatGPT Summary Generation
// ============================================
async function generateSummary(query, searchResults, mode = 'balanced') {
  const apiKey = process.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    return { summary: 'OpenAI API key not configured.', error: true };
  }

  const openai = new OpenAI({ apiKey });

  // Build context from search results
  const sourcesContext = searchResults.slice(0, 6).map((r, i) =>
    `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.domain}`
  ).join('\n\n');

  const systemPrompt = `You are TabKeep AI, an intelligent search assistant. Based on the search results provided, give a helpful, accurate answer to the user's query.

Guidelines:
- Be concise but comprehensive
- Cite sources using [1], [2], etc. when referencing specific information
- If the search results don't fully answer the query, acknowledge limitations
- Provide actionable insights when relevant
- Use markdown formatting for better readability

Search Results:
${sourcesContext}`;

  const modelConfig = {
    speed: { model: 'gpt-4o-mini', maxTokens: 300, temp: 0.3 },
    balanced: { model: 'gpt-4o-mini', maxTokens: 500, temp: 0.5 },
    quality: { model: 'gpt-4o', maxTokens: 800, temp: 0.7 },
  }[mode] || { model: 'gpt-4o-mini', maxTokens: 500, temp: 0.5 };

  try {
    const completion = await openai.chat.completions.create({
      model: modelConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temp,
    });

    return {
      summary: completion.choices[0]?.message?.content || '',
      model: modelConfig.model,
      tokens: completion.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error('[OPENAI] Error:', error.message);
    return { summary: '', error: error.message };
  }
}

// ============================================
// Main Search Endpoint (Combined)
// ============================================
app.post('/api/search', async (req, res) => {
  const startTime = Date.now();
  const { query, mode = 'balanced', count = 8 } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // Step 1: Brave Search
    const searchData = await braveSearch(query, count);

    // Step 2: Generate ChatGPT Summary (if we have results)
    let aiSummary = { summary: '' };
    if (searchData.results.length > 0) {
      aiSummary = await generateSummary(query, searchData.results, mode);
    }

    // Step 3: Build response
    const response = {
      success: true,
      query,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      cached: searchData.cached,
      mode,
      results: searchData.results.map(r => ({
        ...r,
        summary: null, // Individual summaries could be added
      })),
      news: searchData.news,
      aiSummary: aiSummary.summary,
      aiModel: aiSummary.model,
      sources: searchData.results.map((r, i) => ({
        id: i + 1,
        title: r.title,
        url: r.url,
        domain: r.domain,
      })),
      metadata: {
        totalResults: searchData.totalResults,
        tokensUsed: aiSummary.tokens || 0,
        searchEngine: 'Brave',
        aiProvider: 'OpenAI',
      },
    };

    res.json(response);
  } catch (error) {
    console.error('[SEARCH] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      query,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// Get Current Date/Time String
// ============================================
function getCurrentDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  };
  return now.toLocaleDateString('en-US', options);
}

// ============================================
// Check if query needs video/image results
// ============================================
function shouldShowMedia(query) {
  const q = query.toLowerCase();

  // Queries that benefit from videos
  const videoKeywords = [
    'how to', 'tutorial', 'guide', 'learn', 'watch', 'video',
    'review', 'unboxing', 'gameplay', 'trailer', 'music', 'song',
    'recipe', 'cooking', 'workout', 'exercise', 'dance',
    'diy', 'craft', 'makeup', 'hairstyle', 'interview'
  ];

  // Queries that benefit from images
  const imageKeywords = [
    'what does', 'look like', 'picture', 'photo', 'image',
    'design', 'style', 'fashion', 'architecture', 'art',
    'logo', 'diagram', 'chart', 'infographic', 'meme',
    'animal', 'plant', 'food', 'place', 'landscape'
  ];

  // Queries that should NOT show media
  const noMediaKeywords = [
    'what year', 'what time', 'what date', 'what day',
    'how old', 'how many', 'how much', 'price of',
    'definition', 'meaning of', 'who is the president',
    'capital of', 'population of', 'weather', 'temperature'
  ];

  // Check exclusions first
  for (const keyword of noMediaKeywords) {
    if (q.includes(keyword)) {
      return { videos: false, images: false };
    }
  }

  const showVideos = videoKeywords.some(kw => q.includes(kw));
  const showImages = imageKeywords.some(kw => q.includes(kw));

  return { videos: showVideos, images: showImages };
}

// ============================================
// Get user location from IP (for weather queries)
// ============================================
async function getLocationFromIP(ip) {
  try {
    // Use ip-api.com (free, no API key needed)
    const cleanIP = ip === '::1' || ip === '127.0.0.1' ? '' : ip;
    const url = cleanIP ? `http://ip-api.com/json/${cleanIP}` : 'http://ip-api.com/json/';

    const response = await axios.get(url, { timeout: 3000 });
    if (response.data.status === 'success') {
      return {
        city: response.data.city,
        region: response.data.regionName,
        country: response.data.country,
        lat: response.data.lat,
        lon: response.data.lon,
        timezone: response.data.timezone,
      };
    }
  } catch (error) {
    console.error('[LOCATION] Error:', error.message);
  }
  return null;
}

// ============================================
// Check if query is location-dependent
// ============================================
function isLocationQuery(query) {
  const q = query.toLowerCase();
  const locationKeywords = [
    'weather', 'temperature', 'forecast', 'rain', 'snow',
    'near me', 'nearby', 'in my area', 'local', 'around here',
    'restaurants', 'stores', 'shops', 'gas stations',
    'time zone', 'sunrise', 'sunset'
  ];
  return locationKeywords.some(kw => q.includes(kw));
}

// ============================================
// Query Intent Classifier
// ============================================
async function classifyIntent(query, openai) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a query classifier. Analyze the user's message and determine if it requires a web search.

Return ONLY one word: "search" or "chat"

Use "search" for:
- Questions about facts, news, current events
- "What is", "How to", "Who is", "When did" questions
- Requests for information, tutorials, guides
- Product/service lookups
- Technical questions needing documentation
- Anything requiring up-to-date or factual information
- Weather or location-based questions

Use "chat" for:
- Greetings (hi, hello, hey, what's up)
- Casual conversation
- Personal opinions or advice
- Creative writing requests
- Math calculations
- Code writing/debugging (unless asking about a specific library/API)
- Roleplay or hypothetical scenarios
- Thank you messages
- Simple yes/no personal questions
- Questions about current time/date (you know this already)`
        },
        { role: 'user', content: query }
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const intent = response.choices[0]?.message?.content?.toLowerCase().trim();
    console.log(`[CLASSIFY] "${query.substring(0, 50)}..." -> ${intent}`);
    return intent === 'search' ? 'search' : 'chat';
  } catch (error) {
    console.error('[CLASSIFY] Error:', error.message);
    // Default to chat for safety (don't waste search API calls)
    return 'chat';
  }
}

// ============================================
// Streaming Chat Endpoint (Smart)
// ============================================
app.post('/api/perplexica/chat', async (req, res) => {
  const openaiApiKey = process.env.VITE_OPENAI_API_KEY;

  if (!openaiApiKey) {
    return res.status(400).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const { message, optimizationMode = 'balanced', history = [], forceSearch = false, sourceFocus = 'all', domainFilter = '' } = req.body;

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

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Get current date/time for context
    const currentDateTime = getCurrentDateTime();

    // Get user location if needed for weather/location queries
    let userLocation = null;
    if (isLocationQuery(message)) {
      const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
      userLocation = await getLocationFromIP(clientIP);
      if (userLocation) {
        console.log(`[LOCATION] Detected: ${userLocation.city}, ${userLocation.region}, ${userLocation.country}`);
      }
    }

    // Step 1: Classify intent (skip if forced search)
    let needsSearch = forceSearch;
    if (!forceSearch) {
      sendSSE('thinking', { content: 'Understanding your message...' });
      needsSearch = (await classifyIntent(message, openai)) === 'search';
    }

    let sources = [];
    let systemPrompt = '';

    // Base context with current time and location
    const baseContext = `Current date and time: ${currentDateTime}
${userLocation ? `User's location: ${userLocation.city}, ${userLocation.region}, ${userLocation.country}` : ''}`;

    if (needsSearch) {
      // Step 2a: Web search needed
      sendSSE('thinking', { content: 'Searching the web...' });

      // If location query and we have location, enhance the search
      let searchQuery = message;
      if (userLocation && isLocationQuery(message)) {
        // Add location to search query if not already specified
        if (!message.toLowerCase().includes(userLocation.city.toLowerCase())) {
          searchQuery = `${message} ${userLocation.city}`;
        }
      }

      // Add domain filter if specified
      if (domainFilter) {
        searchQuery = `${searchQuery} site:${domainFilter}`;
      }

      const searchData = await braveSearch(searchQuery, 8, sourceFocus);

      sources = searchData.results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        domain: r.domain,
        favicon: r.favicon,
      }));

      // Check if we should show videos/images for this query
      const mediaFilter = shouldShowMedia(message);
      const filteredVideos = mediaFilter.videos ? (searchData.videos || []) : [];
      const filteredImages = mediaFilter.images ? (searchData.images || []) : [];

      // Send sources, videos, and images (filtered)
      if (sources.length > 0 || filteredVideos.length > 0 || filteredImages.length > 0) {
        sendSSE('sources', {
          sources,
          videos: filteredVideos,
          images: filteredImages,
          news: searchData.news || [],
        });
      }

      const sourcesContext = sources.slice(0, 6).map((s, i) =>
        `[${i + 1}] ${s.title}\n${s.snippet}\nURL: ${s.url}`
      ).join('\n\n');

      systemPrompt = `You are TabKeep AI, a helpful assistant with real-time web search capabilities.

${baseContext}

When answering:
- Reference sources using [1], [2], etc. when citing specific information
- Be conversational and helpful
- Use markdown formatting for better readability
- ALWAYS use the current date/time provided above when answering time-related questions
- For weather queries, use the user's location if provided

Web Search Results:
${sourcesContext}`;

    } else {
      // Step 2b: Direct chat (no search needed)
      systemPrompt = `You are TabKeep AI, a friendly and helpful assistant.

${baseContext}

Guidelines:
- Be conversational and natural
- Be helpful and informative
- Use markdown formatting when appropriate
- For greetings, respond warmly and ask how you can help
- You can help with coding, writing, math, advice, and general questions
- ALWAYS use the current date/time provided above when answering time-related questions
- If asked about the current year, date, or time, use the information above`;
    }

    // Step 3: Generate AI response
    sendSSE('thinking', { content: needsSearch ? 'Analyzing results...' : '' });

    const modelConfig = {
      speed: { model: 'gpt-4o-mini', temperature: 0.3 },
      balanced: { model: 'gpt-4o-mini', temperature: 0.7 },
      quality: { model: 'gpt-4o', temperature: 0.8 },
    }[optimizationMode];

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const stream = await openai.chat.completions.create({
      model: modelConfig.model,
      messages,
      temperature: modelConfig.temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        sendSSE('content', { content });
      }
    }

    sendSSE('done', { searchUsed: needsSearch, sourcesCount: sources.length });
    res.end();
  } catch (error) {
    console.error('[CHAT] Error:', error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// ============================================
// Brave Search Only Endpoint
// ============================================
app.post('/api/perplexica/search', async (req, res) => {
  const { query, count = 10 } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const results = await braveSearch(query, count);
  res.json(results);
});

// ============================================
// Suggest Related Queries
// ============================================
app.post('/api/suggest', async (req, res) => {
  const { query } = req.body;
  const apiKey = process.env.VITE_OPENAI_API_KEY;

  if (!query || !apiKey) {
    return res.json({ suggestions: [] });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate 4 related search queries based on the user\'s query. Return only a JSON array of strings.',
        },
        { role: 'user', content: query },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content || '[]';
    const suggestions = JSON.parse(text.replace(/```json?\n?|\n?```/g, ''));
    res.json({ suggestions: Array.isArray(suggestions) ? suggestions : [] });
  } catch (error) {
    res.json({ suggestions: [] });
  }
});

// ============================================
// File Upload Endpoint
// ============================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = '/tmp/tabkeep-uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.txt', '.doc', '.docx', '.md', '.csv', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

app.post('/api/perplexica/upload', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => {
      // Read file content for text files
      let content = '';
      const ext = path.extname(file.originalname).toLowerCase();
      if (['.txt', '.md', '.csv', '.json'].includes(ext)) {
        content = fs.readFileSync(file.path, 'utf-8').substring(0, 50000); // Limit to 50K chars
      }

      return {
        fileId: file.filename,
        fileName: file.originalname,
        fileExtension: ext,
        content,
        size: file.size,
      };
    });

    console.log(`[UPLOAD] ${uploadedFiles.length} files uploaded`);
    res.json({ files: uploadedFiles });
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Widget Detection
// ============================================
function detectWidget(query) {
  const q = query.toLowerCase();

  // Weather widget
  if (/weather|temperature|forecast|rain|snow|sunny|cloudy/.test(q)) {
    return { type: 'weather', detected: true };
  }

  // Calculator widget - detect math expressions
  if (/^[\d\s\+\-\*\/\(\)\.\^%]+$/.test(q.replace(/\s/g, '')) ||
      /calculate|compute|what is \d|how much is \d/.test(q)) {
    try {
      // Try to evaluate simple math
      const mathExpr = q.replace(/[^\d\+\-\*\/\(\)\.\s]/g, '').trim();
      if (mathExpr && /^[\d\s\+\-\*\/\(\)\.]+$/.test(mathExpr)) {
        const result = Function('"use strict";return (' + mathExpr + ')')();
        if (!isNaN(result) && isFinite(result)) {
          return { type: 'calculator', detected: true, data: { expression: mathExpr, result } };
        }
      }
    } catch (e) {}
  }

  // Time widget
  if (/what time|current time|time in|time zone/.test(q)) {
    return { type: 'time', detected: true };
  }

  // Currency conversion
  if (/convert|exchange rate|\d+\s*(usd|eur|gbp|jpy|cny|inr|btc|eth)/.test(q)) {
    return { type: 'currency', detected: true };
  }

  // Stock prices
  if (/stock price|stock of|shares of|\$[a-z]{1,5}|ticker/.test(q)) {
    return { type: 'stock', detected: true };
  }

  // Definition
  if (/define|definition|what does .* mean|meaning of/.test(q)) {
    return { type: 'definition', detected: true };
  }

  return null;
}

// ============================================
// Discover/Trending Content Endpoint
// ============================================
app.get('/api/discover', async (req, res) => {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    return res.json({ trending: [], articles: [] });
  }

  try {
    // Fetch trending topics
    const response = await axios.get('https://api.search.brave.com/res/v1/news/search', {
      params: {
        q: 'trending technology AI',
        count: 10,
        freshness: 'pd', // Past day
      },
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
      timeout: 10000,
    });

    const articles = (response.data.results || []).map(article => ({
      title: article.title,
      url: article.url,
      snippet: article.description,
      source: article.meta_url?.hostname || '',
      thumbnail: article.thumbnail?.src || null,
      age: article.age,
    }));

    res.json({ articles });
  } catch (error) {
    console.error('[DISCOVER] Error:', error.message);
    res.json({ articles: [] });
  }
});

// ============================================
// Health Check
// ============================================
app.get('/api/health', (req, res) => {
  const openaiKey = process.env.VITE_OPENAI_API_KEY;
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: {
      entries: cache.size,
      ttlMinutes: CACHE_TTL / 60000,
    },
    apis: {
      openai: openaiKey ? 'configured' : 'missing',
      brave: braveKey ? 'configured' : 'missing',
    },
  });
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           TabKeep AI Search Engine Server                 ║
╠═══════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                             ║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                               ║
║    POST /api/perplexica/chat   - Streaming AI chat        ║
║    POST /api/perplexica/search - Web search               ║
║    POST /api/perplexica/upload - File uploads             ║
║    POST /api/suggest           - Smart suggestions        ║
║    GET  /api/discover          - Trending content         ║
║    GET  /api/health            - Health check             ║
╠═══════════════════════════════════════════════════════════╣
║  Features:                                                ║
║    ⚡ Speed/Balanced/Quality modes                        ║
║    🧭 Source focus (Web/Academic/News/Videos)             ║
║    🧩 Smart widgets (Weather, Calculator, Time)           ║
║    📷 Image & Video search                                ║
║    📄 File uploads (PDF, TXT, MD, CSV, JSON)              ║
║    🌐 Domain-specific search                              ║
║    💡 Smart suggestions                                   ║
║    📚 Discover/Trending                                   ║
║    🕒 Search history (client-side)                        ║
╚═══════════════════════════════════════════════════════════╝
`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});
