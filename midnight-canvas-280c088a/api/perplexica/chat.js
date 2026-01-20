import OpenAI from 'openai';

export const config = {
  runtime: 'edge',
};

// Brave Search API
async function braveSearch(query, apiKey, count = 8, sourceFocus = 'all') {
  if (!apiKey) {
    return { results: [], videos: [], images: [] };
  }

  try {
    const searchPromises = [];

    // Web search
    searchPromises.push(
      fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey,
        },
      }).then(r => r.json()).catch(() => ({}))
    );

    // Video search
    searchPromises.push(
      fetch(`https://api.search.brave.com/res/v1/videos/search?q=${encodeURIComponent(query)}&count=6`, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey,
        },
      }).then(r => r.json()).catch(() => ({}))
    );

    // Image search
    searchPromises.push(
      fetch(`https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=6`, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey,
        },
      }).then(r => r.json()).catch(() => ({}))
    );

    const [webData, videoData, imageData] = await Promise.all(searchPromises);

    const results = (webData.web?.results || []).map((r, idx) => ({
      position: idx + 1,
      title: r.title,
      url: r.url,
      snippet: r.description || '',
      domain: new URL(r.url).hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=32`,
    }));

    const videos = (videoData.results || []).slice(0, 6).map(v => ({
      title: v.title,
      url: v.url,
      thumbnail: v.thumbnail?.src || null,
      duration: v.video?.duration || null,
      publisher: v.meta_url?.hostname || '',
      isYouTube: v.url?.includes('youtube.com') || v.url?.includes('youtu.be'),
    }));

    const images = (imageData.results || []).slice(0, 6).map(img => ({
      title: img.title,
      url: img.url,
      thumbnail: img.thumbnail?.src || img.properties?.url || null,
      source: img.source,
    }));

    return { results, videos, images };
  } catch (error) {
    console.error('[BRAVE] Error:', error.message);
    return { results: [], videos: [], images: [] };
  }
}

// Intent classifier
async function classifyIntent(query, openai) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Classify if this query needs web search. Return ONLY "search" or "chat".
Use "search" for: facts, news, current events, how-to, who/what/when questions, technical docs, weather.
Use "chat" for: greetings, casual chat, opinions, creative writing, math, code writing, roleplay.`
        },
        { role: 'user', content: query }
      ],
      max_tokens: 10,
      temperature: 0,
    });
    return response.choices[0]?.message?.content?.toLowerCase().trim() === 'search' ? 'search' : 'chat';
  } catch {
    return 'chat';
  }
}

// Current date/time
function getCurrentDateTime() {
  return new Date().toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const openaiApiKey = process.env.VITE_OPENAI_API_KEY;
  const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!openaiApiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { message, optimizationMode = 'balanced', history = [], forceSearch = false, sourceFocus = 'all' } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendSSE = async (type, data) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`));
    };

    // Process in background
    (async () => {
      try {
        const openai = new OpenAI({ apiKey: openaiApiKey });
        const currentDateTime = getCurrentDateTime();

        // Classify intent
        let needsSearch = forceSearch;
        if (!forceSearch) {
          await sendSSE('thinking', { content: 'Understanding your message...' });
          needsSearch = (await classifyIntent(message, openai)) === 'search';
        }

        let sources = [];
        let systemPrompt = '';

        if (needsSearch && braveApiKey) {
          await sendSSE('thinking', { content: 'Searching the web...' });
          const searchData = await braveSearch(message, braveApiKey, 8, sourceFocus);

          sources = searchData.results.map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            domain: r.domain,
            favicon: r.favicon,
          }));

          if (sources.length > 0) {
            await sendSSE('sources', {
              sources,
              videos: searchData.videos || [],
              images: searchData.images || [],
            });
          }

          const sourcesContext = sources.slice(0, 6).map((s, i) =>
            `[${i + 1}] ${s.title}\n${s.snippet}\nURL: ${s.url}`
          ).join('\n\n');

          systemPrompt = `You are TabKeep AI, a helpful assistant with web search.

Current date: ${currentDateTime}

Reference sources using [1], [2], etc. Use markdown formatting.

Web Search Results:
${sourcesContext}`;
        } else {
          systemPrompt = `You are TabKeep AI, a friendly assistant.

Current date: ${currentDateTime}

Be conversational, helpful, and use markdown when appropriate.`;
        }

        await sendSSE('thinking', { content: needsSearch ? 'Analyzing results...' : '' });

        const modelConfig = {
          speed: { model: 'gpt-4o-mini', temperature: 0.3 },
          balanced: { model: 'gpt-4o-mini', temperature: 0.7 },
          quality: { model: 'gpt-4o', temperature: 0.8 },
        }[optimizationMode] || { model: 'gpt-4o-mini', temperature: 0.7 };

        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ];

        const completion = await openai.chat.completions.create({
          model: modelConfig.model,
          messages,
          temperature: modelConfig.temperature,
          stream: true,
        });

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            await sendSSE('content', { content });
          }
        }

        await sendSSE('done', { searchUsed: needsSearch, sourcesCount: sources.length });
      } catch (error) {
        console.error('[CHAT] Error:', error);
        await sendSSE('error', { message: error.message });
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[CHAT] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
