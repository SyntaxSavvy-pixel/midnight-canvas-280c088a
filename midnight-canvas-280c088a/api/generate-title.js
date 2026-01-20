// TabKeep Title Generator - Clean implementation
export const config = {
  runtime: 'edge',
};

// Simple local title generation (no API needed)
function generateTitle(message) {
  const q = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hey|hello|yo|sup|hola)/i.test(q)) return 'Greeting';
  if (/^good (morning|afternoon|evening|night)/i.test(q)) return 'Greeting';

  // Common patterns
  if (/weather/i.test(q)) return 'Weather Check';
  if (/news/i.test(q)) return 'News Update';
  if (/^what is/i.test(q)) return message.replace(/^what is /i, '').slice(0, 25);
  if (/^who is/i.test(q)) return message.replace(/^who is /i, '').slice(0, 25);
  if (/^how (to|do|can)/i.test(q)) return message.replace(/^how (to|do|can) /i, '').slice(0, 25);
  if (/code|debug|programming/i.test(q)) return 'Code Help';
  if (/write|essay|story/i.test(q)) return 'Writing Help';
  if (/help/i.test(q)) return 'Help Request';

  // Default: first few words
  const words = message.trim().split(/\s+/).slice(0, 4).join(' ');
  return words.length > 30 ? words.slice(0, 27) + '...' : words;
}

export default async function handler(req) {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { message } = await req.json();
    const title = message ? generateTitle(message) : 'New Chat';

    return new Response(JSON.stringify({ title }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response(JSON.stringify({ title: 'New Chat' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
