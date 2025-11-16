/**
 * Cloudflare Worker for Claude AI Chat API
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to Cloudflare Dashboard → Workers & Pages
 * 2. Create a new Worker
 * 3. Name it: claude-chat-api
 * 4. Copy this code into the worker
 * 5. Add Environment Variable:
 *    - Name: ANTHROPIC_API_KEY
 *    - Value: Your Claude API key from https://console.anthropic.com
 * 6. Deploy
 * 7. Set up route: https://tabmangment.com/api/claude-chat → claude-chat-api worker
 */

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== 'POST') {
        return new Response('Method not allowed', {
            status: 405,
            headers: corsHeaders
        });
    }

    try {
        // Parse request body
        const body = await request.json();
        const { messages, model, max_tokens, system, userEmail } = body;

        // Validate required fields
        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({
                error: 'Messages array is required'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Call Claude API
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model || 'claude-3-5-sonnet-20241022',
                max_tokens: max_tokens || 1024,
                system: system || 'You are a helpful AI assistant.',
                messages: messages
            })
        });

        if (!claudeResponse.ok) {
            const errorText = await claudeResponse.text();
            throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
        }

        const data = await claudeResponse.json();

        // Return Claude's response
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
