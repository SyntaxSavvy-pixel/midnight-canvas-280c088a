import OpenAI from 'openai';

export const config = {
  runtime: 'edge',
};

// Smart title generation without API call
function generateSmartTitle(message) {
  const q = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hey|hello|yo|sup|hola|greetings)/i.test(q)) return 'Greeting';
  if (/^(good morning|gm)/i.test(q)) return 'Morning Greeting';
  if (/^(good afternoon)/i.test(q)) return 'Afternoon Greeting';
  if (/^(good evening|good night|gn)/i.test(q)) return 'Evening Greeting';

  // Questions
  if (/^what is/i.test(q)) return message.replace(/^what is /i, '').slice(0, 20);
  if (/^who is/i.test(q)) return message.replace(/^who is /i, '').slice(0, 20);
  if (/^how (to|do|can)/i.test(q)) return message.replace(/^how (to|do|can) /i, '').slice(0, 20);
  if (/^why/i.test(q)) return message.replace(/^why /i, '').slice(0, 20);
  if (/weather/i.test(q)) return 'Weather Check';
  if (/news/i.test(q)) return 'News Update';

  // Topics
  if (/code|debug|programming|python|javascript/i.test(q)) return 'Code Help';
  if (/write|essay|story|poem/i.test(q)) return 'Writing Help';
  if (/explain|understand/i.test(q)) return 'Explanation';
  if (/help/i.test(q)) return 'Help Request';

  // Default: first few words, capitalized
  const words = message.trim().split(/\s+/).slice(0, 3).join(' ');
  return words.length > 25 ? words.slice(0, 22) + '...' : words;
}

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

    // If no API key, use smart local title generation
    if (!apiKey) {
      const title = generateSmartTitle(message);
      return new Response(JSON.stringify({ title }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-chat-latest',
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
"hi there" → Greeting
Return ONLY the title.`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 15,
      temperature: 0.3,
    });

    const title = completion.choices[0]?.message?.content?.trim()?.replace(/['"]/g, '') || generateSmartTitle(message);

    return new Response(JSON.stringify({ title }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[TITLE] Error:', error);
    // Fallback to smart local title
    try {
      const { message } = await req.clone().json();
      const title = generateSmartTitle(message || 'New Chat');
      return new Response(JSON.stringify({ title }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify({ title: 'New Chat' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}
