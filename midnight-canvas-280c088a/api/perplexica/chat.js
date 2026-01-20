export const config = {
  runtime: 'edge',
  maxDuration: 60,
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

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
        // Build conversation as single input string
        let inputText = '';
        if (history.length > 0) {
          const recentHistory = history.slice(-10);
          for (const h of recentHistory) {
            inputText += `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}\n\n`;
          }
        }
        inputText += `User: ${message}`;

        // Simple Responses API format
        const requestBody = {
          model: 'gpt-4o',
          tools: [{ type: 'web_search' }],
          input: inputText,
          stream: true,
        };

        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error('[CHAT] API Error:', errText);
          throw new Error(`API error: ${response.status} - ${errText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
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
                const eventType = parsed.type || '';

                // Handle text content delta (multiple possible formats)
                if (eventType === 'response.output_text.delta') {
                  const text = parsed.delta || parsed.text || '';
                  if (text) {
                    await sendSSE('content', { content: text });
                  }
                }

                // Handle content part delta (alternative format)
                if (eventType === 'response.content_part.delta') {
                  const text = parsed.delta?.text || parsed.text || '';
                  if (text) {
                    await sendSSE('content', { content: text });
                  }
                }

                // Handle output item done (might contain full text)
                if (eventType === 'response.output_item.done') {
                  const content = parsed.item?.content;
                  if (Array.isArray(content)) {
                    for (const part of content) {
                      if (part.type === 'output_text' && part.text) {
                        // Only send if we haven't been streaming
                        // await sendSSE('content', { content: part.text });
                      }
                    }
                  }
                }

                // Handle web search sources
                if (eventType.includes('annotation') || eventType.includes('url_citation')) {
                  const cite = parsed.annotation || parsed;
                  if (cite.url) {
                    await sendSSE('sources', {
                      sources: [{
                        title: cite.title || cite.url,
                        url: cite.url,
                      }]
                    });
                  }
                }

                // Also check for citations in response.completed
                if (eventType === 'response.completed' && parsed.response?.output) {
                  for (const item of parsed.response.output) {
                    if (item.content) {
                      for (const part of item.content) {
                        if (part.annotations) {
                          for (const ann of part.annotations) {
                            if (ann.type === 'url_citation' && ann.url) {
                              await sendSSE('sources', {
                                sources: [{
                                  title: ann.title || ann.url,
                                  url: ann.url,
                                }]
                              });
                            }
                          }
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                console.error('[CHAT] Parse error:', e);
              }
            }
          }
        }

        await sendSSE('done', {});
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
