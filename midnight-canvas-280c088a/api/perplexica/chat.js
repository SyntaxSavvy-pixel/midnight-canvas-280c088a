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

        // Try NON-streaming first to verify API works
        const requestBody = {
          model: 'gpt-4o',
          tools: [{ type: 'web_search' }],
          input: inputText,
          // stream: false (default)
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

        // Parse the full response
        const result = await response.json();
        console.log('[CHAT] Full response:', JSON.stringify(result).slice(0, 500));

        // Extract text from the response
        let fullText = '';
        const sources = [];

        // Try to get output_text from response
        if (result.output_text) {
          fullText = result.output_text;
        }

        // Or try output array
        if (result.output && Array.isArray(result.output)) {
          for (const item of result.output) {
            if (item.type === 'message' && item.content) {
              for (const part of item.content) {
                if (part.type === 'output_text' || part.type === 'text') {
                  fullText += part.text || '';
                }
                // Get citations
                if (part.annotations) {
                  for (const ann of part.annotations) {
                    if (ann.type === 'url_citation' && ann.url) {
                      sources.push({
                        title: ann.title || ann.url,
                        url: ann.url,
                      });
                    }
                  }
                }
              }
            }
          }
        }

        // Send sources first
        if (sources.length > 0) {
          await sendSSE('sources', { sources });
        }

        // Send the full text content
        if (fullText) {
          await sendSSE('content', { content: fullText });
        } else {
          await sendSSE('content', { content: 'No response text received from API.' });
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
