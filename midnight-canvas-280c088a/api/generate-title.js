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

  const apiKey = process.env.OPENAI_API_KEY;

  try {
    const { message } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ title: 'New Chat' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!apiKey) {
      // Fallback: create simple title from first few words
      const words = message.trim().split(' ').slice(0, 4).join(' ');
      return new Response(JSON.stringify({ title: words.length > 25 ? words.slice(0, 25) + '...' : words }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Create a 2-4 word title summarizing what the user wants. No quotes, no punctuation.
Examples:
"how do I make pasta" → Making Pasta
"what's the weather" → Weather Check
"hello how are you" → Greeting
"explain quantum physics" → Quantum Physics
"debug my code" → Code Debugging
Return ONLY the title.`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 15,
      temperature: 0.3,
    });

    const title = completion.choices[0]?.message?.content?.trim()?.replace(/['"]/g, '') || message.slice(0, 25);

    return new Response(JSON.stringify({ title }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[TITLE] Error:', error);
    return new Response(JSON.stringify({ title: 'New Chat' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
