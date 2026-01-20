export const config = {
  runtime: 'edge',
  maxDuration: 60,
};

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

  const openaiApiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

  if (!openaiApiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { message, optimizationMode = 'balanced', history = [], forceSearch = false } = await req.json();

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
        const currentDateTime = getCurrentDateTime();

        await sendSSE('thinking', { content: 'Searching and analyzing...' });

        // Build conversation history for the API
        const previousMessages = history.slice(-10).map(h => ({
          role: h.role,
          content: h.content
        }));

        // Use OpenAI Responses API with built-in web search
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: optimizationMode === 'quality' ? 'gpt-4o' : 'gpt-4o-mini',
            input: [
              {
                role: 'system',
                content: `You are TabKeep AI, a helpful search assistant. Current date: ${currentDateTime}.
Be conversational and helpful. Use markdown formatting. When citing sources, use [Source Title](URL) format.`
              },
              ...previousMessages,
              {
                role: 'user',
                content: message
              }
            ],
            tools: [
              {
                type: 'web_search',
                search_context_size: 'medium',
                user_location: {
                  type: 'approximate'
                }
              }
            ],
            max_output_tokens: 2048,
            stream: true,
            include: ['web_search_call.action.sources']
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'OpenAI API error');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sources = [];
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);

                // Handle different event types
                if (parsed.type === 'response.output_text.delta') {
                  await sendSSE('content', { content: parsed.delta || '' });
                } else if (parsed.type === 'response.web_search_call.sources') {
                  // Extract sources from web search
                  sources = (parsed.sources || []).map(s => ({
                    title: s.title,
                    url: s.url,
                    snippet: s.snippet || '',
                    domain: new URL(s.url).hostname,
                    favicon: `https://www.google.com/s2/favicons?domain=${new URL(s.url).hostname}&sz=32`,
                  }));
                  if (sources.length > 0) {
                    await sendSSE('sources', { sources, videos: [], images: [] });
                  }
                } else if (parsed.type === 'response.completed') {
                  // Response complete
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        await sendSSE('done', { searchUsed: true, sourcesCount: sources.length });
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
