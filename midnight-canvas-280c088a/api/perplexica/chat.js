export const config = {
  runtime: 'edge',
  maxDuration: 60,
};

function getCurrentDateTime() {
  return new Date().toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });
}

// Check if query needs web search
function needsWebSearch(query) {
  const q = query.toLowerCase().trim();

  // DON'T search for these (casual chat)
  const casualPatterns = [
    /^(hi|hey|hello|yo|sup|hiya|howdy|greetings)/,
    /^(how are you|how's it going|what's up|whats up)/,
    /^(good morning|good afternoon|good evening|good night)/,
    /^(thanks|thank you|thx|ty|appreciate)/,
    /^(bye|goodbye|see you|later|cya)/,
    /^(ok|okay|sure|yes|no|yeah|nah|yep|nope)/,
    /^(nice|cool|awesome|great|amazing|wow)/,
    /^(help me write|write me|create a|generate)/,
    /^(can you|could you|would you|please)/,
    /tell me a joke/,
    /^(lol|haha|lmao|rofl)/,
  ];

  for (const pattern of casualPatterns) {
    if (pattern.test(q)) return false;
  }

  // DO search for these (factual queries)
  const searchPatterns = [
    /^(what is|what are|what's|whats)/,
    /^(who is|who are|who's|whos)/,
    /^(where is|where are|where's)/,
    /^(when did|when was|when is|when will)/,
    /^(why did|why is|why are|why do)/,
    /^(how to|how do|how does|how can)/,
    /^(is there|are there|does|do)/,
    /(weather|temperature|forecast)/,
    /(news|latest|recent|update)/,
    /(price|cost|stock|crypto)/,
    /(best|top|recommend|review)/,
    /\d{4}/, // years
    /(site:|\.com|\.org|\.net)/, // URLs
  ];

  for (const pattern of searchPatterns) {
    if (pattern.test(q)) return true;
  }

  // Default: don't search for short messages
  return q.split(' ').length > 5;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { message, history = [] } = await req.json();

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

    (async () => {
      try {
        const currentDateTime = getCurrentDateTime();
        const shouldSearch = needsWebSearch(message);

        // Build messages
        const messages = [
          {
            role: 'system',
            content: `You are TabKeep AI, a helpful assistant. Current date: ${currentDateTime}.
Be conversational, friendly, and helpful. Use markdown for formatting when appropriate.
${shouldSearch ? 'You have access to web search. Cite sources naturally in your response.' : 'Respond naturally without searching the web.'}`
          },
          ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message }
        ];

        // Build request - only add web_search tool if needed
        const requestBody = {
          model: 'gpt-4o-mini',
          input: messages,
          max_output_tokens: 2048,
          stream: true,
        };

        if (shouldSearch) {
          await sendSSE('thinking', { content: 'Searching...' });
          requestBody.tools = [{
            type: 'web_search',
            search_context_size: 'medium',
            user_location: { type: 'approximate' }
          }];
          requestBody.include = ['web_search_call.action.sources'];
        }

        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || 'API error');
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

                if (parsed.type === 'response.output_text.delta') {
                  await sendSSE('content', { content: parsed.delta || '' });
                } else if (parsed.type === 'response.web_search_call.sources' && shouldSearch) {
                  sources = (parsed.sources || []).slice(0, 5).map(s => ({
                    title: s.title,
                    url: s.url,
                  }));
                  if (sources.length > 0) {
                    await sendSSE('sources', { sources });
                  }
                }
              } catch {}
            }
          }
        }

        await sendSSE('done', { searchUsed: shouldSearch, sourcesCount: sources.length });
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
