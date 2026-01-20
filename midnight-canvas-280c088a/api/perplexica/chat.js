export const config = {
  runtime: 'edge',
  maxDuration: 60,
};

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
        // Build input from history and current message
        const input = [
          ...history.slice(-10).map(h => ({
            role: h.role,
            content: h.content
          })),
          { role: 'user', content: message }
        ];

        // Use OpenAI Responses API with saved prompt
        const requestBody = {
          prompt: {
            id: 'pmpt_696989b3e12481968e301ed9ee0ab5610c74eacb2e740c2c',
            version: '3'
          },
          input: input,
          text: {
            format: {
              type: 'text'
            }
          },
          reasoning: {},
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
          store: true,
          stream: true,
          include: [
            'web_search_call.results'
          ]
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
          const err = await response.json();
          throw new Error(err.error?.message || `API error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let sources = [];

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

                // Handle text content
                if (parsed.type === 'response.output_text.delta') {
                  await sendSSE('content', { content: parsed.delta || '' });
                }

                // Handle web search sources
                if (parsed.type === 'response.web_search_call.results') {
                  sources = (parsed.results || []).slice(0, 5).map(s => ({
                    title: s.title || s.name || '',
                    url: s.url || '',
                  }));
                  if (sources.length > 0) {
                    await sendSSE('sources', { sources });
                  }
                }
              } catch {}
            }
          }
        }

        await sendSSE('done', { sourcesCount: sources.length });
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
