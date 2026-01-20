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

                // Handle text content delta
                if (parsed.type === 'response.output_text.delta') {
                  await sendSSE('content', { content: parsed.delta || '' });
                }

                // Handle completed text
                if (parsed.type === 'response.output_text.done') {
                  // Text is complete
                }

                // Handle web search sources (url_citation)
                if (parsed.type === 'response.output_text.annotation' && parsed.annotation?.type === 'url_citation') {
                  const cite = parsed.annotation;
                  await sendSSE('sources', {
                    sources: [{
                      title: cite.title || '',
                      url: cite.url || '',
                    }]
                  });
                }
              } catch {}
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
