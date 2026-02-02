export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    console.error('ANTHROPIC_API_KEY is missing');
    return res.status(200).json({ isPlanMode: false, questions: null });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Use fetch instead of SDK for better serverless compatibility
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `You are a helpful assistant that analyzes user requests and generates clarifying questions to better understand what they want to create.

Your job is to:
1. Determine if the request is a CREATION request (building something: app, game, website, story, design, etc.)
2. If it IS a creation request, generate 2-4 short, relevant questions that would help gather important context
3. If it is NOT a creation request (just a question, information lookup, etc.), return null

IMPORTANT RULES:
- Only trigger for actual CREATION requests where the user wants to BUILD or MAKE something
- Do NOT trigger for questions like "what is...", "how do I...", "tell me about...", "best way to..."
- Do NOT trigger for product recommendations, comparisons, or advice
- Questions should be SHORT (under 30 characters ideally)
- Options should be 3-5 short choices (1-3 words each)
- Make questions specific to what they're creating

Respond ONLY with valid JSON in this exact format:

For creation requests:
{
  "isPlanMode": true,
  "questions": [
    {
      "id": "unique_id",
      "category": "Short Category",
      "question": "Short question?",
      "options": ["Option 1", "Option 2", "Option 3"]
    }
  ]
}

For non-creation requests:
{
  "isPlanMode": false,
  "questions": null
}`,
        messages: [
          {
            role: 'user',
            content: `Analyze this request and generate clarifying questions if it's a creation request:\n\n"${query}"`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      // Return non-plan mode on error so chat continues
      return res.status(200).json({ isPlanMode: false, questions: null });
    }

    const data = await response.json();

    // Parse the AI response
    const content = data.content?.[0];
    if (!content || content.type !== 'text') {
      return res.status(200).json({ isPlanMode: false, questions: null });
    }

    // Extract JSON from the response
    let result;
    try {
      result = JSON.parse(content.text);
    } catch {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(200).json({ isPlanMode: false, questions: null });
      }
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Plan API error:', error.message);
    // Return non-plan mode on error so chat continues
    return res.status(200).json({ isPlanMode: false, questions: null });
  }
}
