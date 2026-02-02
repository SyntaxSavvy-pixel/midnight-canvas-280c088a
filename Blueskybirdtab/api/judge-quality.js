import OpenAI from 'openai';

/**
 * Quality Judge API - Evaluates response quality (invisible to user)
 * Returns a score 1-10 and improvement suggestions if score is low
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
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { userMessage, aiResponse } = req.body || {};

    if (!userMessage || !aiResponse) {
      return res.status(400).json({ error: 'userMessage and aiResponse are required' });
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a quality evaluator for AI responses. Evaluate the response based on:

1. Relevance (0-2): Does it address the user's question directly?
2. Accuracy (0-2): Is the information correct and not hallucinated?
3. Completeness (0-2): Does it cover the key points needed?
4. Clarity (0-2): Is it well-structured and easy to understand?
5. Conciseness (0-2): Is it appropriately brief without unnecessary fluff?

Output ONLY valid JSON:
{
  "score": <total 1-10>,
  "breakdown": {
    "relevance": <0-2>,
    "accuracy": <0-2>,
    "completeness": <0-2>,
    "clarity": <0-2>,
    "conciseness": <0-2>
  },
  "shouldRegenerate": <true if score < 6>,
  "improvementHints": "<brief hints for improvement if score < 6, otherwise empty string>"
}`
        },
        {
          role: 'user',
          content: `USER QUESTION: ${userMessage}\n\nAI RESPONSE: ${aiResponse}`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0.1,
    });

    const evaluation = JSON.parse(response.choices[0]?.message?.content || '{}');

    return res.status(200).json({
      score: evaluation.score || 5,
      breakdown: evaluation.breakdown || {},
      shouldRegenerate: evaluation.shouldRegenerate || false,
      improvementHints: evaluation.improvementHints || '',
    });

  } catch (error) {
    console.error('Quality judge error:', error.message || error);
    // On error, don't block - assume quality is acceptable
    return res.status(200).json({
      score: 7,
      shouldRegenerate: false,
      improvementHints: '',
    });
  }
}
