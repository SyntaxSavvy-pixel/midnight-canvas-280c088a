import OpenAI from 'openai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

  try {
    const { message } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ title: message.slice(0, 30) }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Generate a very short, concise title (2-5 words max) that summarizes what the user is asking about.
Do NOT include quotes or punctuation.
Do NOT start with "How to" or "What is" - just the topic.
Examples:
- "how do I make pasta" → "Making Pasta"
- "what is the weather in new york" → "NYC Weather"
- "explain quantum physics" → "Quantum Physics"
- "hello how are you" → "Greeting"
- "write me a poem about love" → "Love Poem"
- "debug my python code" → "Python Debugging"
Return ONLY the title, nothing else.`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 20,
      temperature: 0.3,
    });

    const title = completion.choices[0]?.message?.content?.trim() || message.slice(0, 30);

    return new Response(JSON.stringify({ title }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[TITLE] Error:', error.message);
    return new Response(JSON.stringify({ title: 'New Chat' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
