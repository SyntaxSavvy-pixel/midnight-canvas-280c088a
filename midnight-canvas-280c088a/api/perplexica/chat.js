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

// Check if query needs web search - be STRICT about not searching for casual chat
function needsWebSearch(query) {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);

  // NEVER search for very short messages (1-3 words unless specific)
  if (words.length <= 3) {
    // Exception: explicit search keywords
    const searchKeywords = ['weather', 'news', 'price', 'stock', 'crypto', 'latest'];
    if (!searchKeywords.some(k => q.includes(k))) {
      return false;
    }
  }

  // DON'T search for these (casual chat) - expanded list
  const casualPatterns = [
    /^(hi|hey|hello|yo|sup|hiya|howdy|greetings|hola|ola)/i,
    /^(how are you|how's it going|what's up|whats up|wassup|how you doing)/i,
    /^(good morning|good afternoon|good evening|good night|gm|gn)/i,
    /^(thanks|thank you|thx|ty|appreciate|cheers)/i,
    /^(bye|goodbye|see you|later|cya|ttyl|peace)/i,
    /^(ok|okay|sure|yes|no|yeah|nah|yep|nope|alright|k|kk)/i,
    /^(nice|cool|awesome|great|amazing|wow|neat|dope|sick)/i,
    /^(help me write|write me|create a|generate|make me)/i,
    /^(can you|could you|would you|please|i want you to|i need you to)/i,
    /^(tell me a joke|make me laugh|say something funny)/i,
    /^(lol|haha|lmao|rofl|xd|hehe)/i,
    /^(what do you think|how do you feel|are you)/i,
    /^(i am|i'm|im|i feel|i think|i want|i need|i have|i love|i hate)/i,
    /^(do you|are you|can you|will you|would you)/i,
    /^(my name is|call me|i go by)/i,
    /^(let's talk|let's chat|want to chat|wanna talk)/i,
  ];

  for (const pattern of casualPatterns) {
    if (pattern.test(q)) return false;
  }

  // Only search for EXPLICIT factual queries about external/real-world info
  const searchPatterns = [
    /\b(what is|what are|what's the)\b.*(in|on|at|for|about)\b/i, // "what is the weather in..."
    /\b(who is|who are|who was|who were)\b/i,
    /\b(where is|where are|where can i)\b/i,
    /\b(when did|when was|when is|when will)\b/i,
    /\b(how much|how many|how long)\b.*(cost|price|take)/i,
    /\b(latest|recent|current|today's|this week)\b.*(news|update|price|weather)/i,
    /\b(weather|forecast|temperature)\b/i,
    /\b(stock price|crypto|bitcoin|market)\b/i,
    /\b(search for|look up|find me|google)\b/i,
    /\b(news about|updates on|information about)\b/i,
  ];

  for (const pattern of searchPatterns) {
    if (pattern.test(q)) return true;
  }

  // Default: DON'T search - let the AI respond naturally
  return false;
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
            content: shouldSearch
              ? `You are TabKeep AI. Current date: ${currentDateTime}. You have web search results to help answer the user's question. Be helpful and cite sources when relevant. Use markdown formatting.`
              : `You are TabKeep AI, a friendly and helpful assistant. Be conversational and natural - respond like a knowledgeable friend would. Don't say you're searching or looking things up. Just have a natural conversation. Use markdown formatting when helpful.`
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
