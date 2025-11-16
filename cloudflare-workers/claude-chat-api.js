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
 */

export default {
    async fetch(request, env) {
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

        // Accept POST at any path (root or with trailing slash)
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

            // Check if API key is set
            if (!env.ANTHROPIC_API_KEY) {
                return new Response(JSON.stringify({
                    error: 'API key not configured',
                    message: 'ANTHROPIC_API_KEY environment variable is not set'
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Call Claude API
            const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': env.ANTHROPIC_API_KEY,
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
                return new Response(JSON.stringify({
                    error: 'Claude API error',
                    status: claudeResponse.status,
                    message: errorText
                }), {
                    status: claudeResponse.status,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
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
};
