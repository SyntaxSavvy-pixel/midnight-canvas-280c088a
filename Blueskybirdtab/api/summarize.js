import OpenAI from 'openai';

/**
 * Summarize API - Condenses AI responses into key bullet points
 * Uses GPT-4o-mini for fast, cost-effective summarization
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { content } = req.body || {};

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (content.length < 100) {
      return res.status(400).json({ error: 'Content is too short to summarize' });
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a summarization assistant. Condense the given text into key bullet points.

RULES:
- Maximum 5 bullet points
- Each bullet should be 1-2 sentences max
- Focus on the most important information
- Use clear, concise language
- Start each bullet with a dash (-)
- Do not add any introduction or conclusion
- Just output the bullet points directly`
        },
        {
          role: 'user',
          content: `Summarize this:\n\n${content}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const summary = response.choices[0]?.message?.content || 'Unable to generate summary.';

    return res.status(200).json({ summary });

  } catch (error) {
    console.error('Summarize API error:', error.message || error);
    return res.status(500).json({
      error: error.message || 'An unexpected error occurred',
    });
  }
}
