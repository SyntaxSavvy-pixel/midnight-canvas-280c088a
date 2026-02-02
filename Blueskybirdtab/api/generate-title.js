export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(200).json({ title: 'New Chat' });
    }

    const trimmedMessage = message.trim();

    // For very short messages, use a simple approach
    if (trimmedMessage.length < 5) {
      return res.status(200).json({ title: 'Quick Chat' });
    }

    // Try OpenAI first, then Claude
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // Try OpenAI
    if (openaiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Generate a short, descriptive title (2-5 words) for this conversation. No quotes, no punctuation at the end. Just the title text. Be specific about the topic.'
              },
              {
                role: 'user',
                content: trimmedMessage
              }
            ],
            max_tokens: 20,
            temperature: 0.7
          })
        });

        if (response.ok) {
          const data = await response.json();
          const title = data.choices?.[0]?.message?.content?.trim() || 'New Chat';
          const cleanTitle = title
            .replace(/^["']|["']$/g, '')
            .replace(/[.!?]$/, '')
            .slice(0, 40);
          return res.status(200).json({ title: cleanTitle || 'New Chat' });
        }
      } catch (openaiError) {
        console.log('OpenAI title generation failed, trying Claude...');
      }
    }

    // Try Claude as fallback
    if (anthropicKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 20,
            system: 'Generate a short, descriptive title (2-5 words) for this conversation. No quotes, no punctuation at the end. Just the title text. Be specific about the topic.',
            messages: [
              {
                role: 'user',
                content: trimmedMessage
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const title = data.content?.[0]?.text?.trim() || 'New Chat';
          const cleanTitle = title
            .replace(/^["']|["']$/g, '')
            .replace(/[.!?]$/, '')
            .slice(0, 40);
          return res.status(200).json({ title: cleanTitle || 'New Chat' });
        }
      } catch (claudeError) {
        console.log('Claude title generation also failed');
      }
    }

    // Fallback: use first few words
    const words = trimmedMessage.split(/\s+/).slice(0, 4).join(' ');
    return res.status(200).json({
      title: words.length > 30 ? words.slice(0, 27) + '...' : words
    });

  } catch (error) {
    console.error('Title generation error:', error.message);

    // Fallback on error
    const { message } = req.body || {};
    if (message) {
      const words = message.trim().split(/\s+/).slice(0, 4).join(' ');
      return res.status(200).json({
        title: words.length > 30 ? words.slice(0, 27) + '...' : words
      });
    }

    return res.status(200).json({ title: 'New Chat' });
  }
}
