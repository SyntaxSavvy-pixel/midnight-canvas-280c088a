/**
 * Secure Perplexity API Proxy
 *
 * This endpoint keeps the Perplexity API key secure on the server.
 * The client never has access to the actual API key.
 *
 * Environment Variables Required:
 * - PERPLEXITY_API_KEY: Your Perplexity API key
 * - SUPABASE_URL: For user verification
 * - SUPABASE_SERVICE_ROLE_KEY: For database access
 */

export async function onRequestPost(context) {
    const { request, env } = context;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Get request body
        const body = await request.json();
        const { query, userEmail } = body;

        if (!query) {
            return new Response(JSON.stringify({ error: 'Query is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!userEmail) {
            return new Response(JSON.stringify({ error: 'User email is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Verify API key is configured
        if (!env.PERPLEXITY_API_KEY) {
            console.error('PERPLEXITY_API_KEY environment variable not set');
            return new Response(JSON.stringify({ error: 'Server configuration error' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Check user's search usage limits via existing endpoint
        const usageResponse = await fetch('https://tabmangment.com/api/check-search-usage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: userEmail })
        });

        if (!usageResponse.ok) {
            console.error('Usage check failed:', {
                status: usageResponse.status,
                email: userEmail
            });
            return new Response(JSON.stringify({
                error: 'Failed to verify search limits',
                details: `Usage check returned ${usageResponse.status}`
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const usageData = await usageResponse.json();

        // Check if user has reached their search limit (canSearch = false means limit reached)
        if (!usageData.canSearch) {
            return new Response(JSON.stringify({
                error: 'Search limit reached',
                limitReached: true,
                searchCount: usageData.searchCount,
                remaining: usageData.remaining
            }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Make request to Perplexity API with server-side key
        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.PERPLEXITY_API_KEY}`
            },
            body: JSON.stringify({
                model: 'sonar-pro',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful search assistant. Provide concise, accurate answers with relevant information.'
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                max_tokens: 1000,
                temperature: 0.2,
                top_p: 0.9,
                return_citations: true,
                return_images: false,
                return_related_questions: false,
                search_recency_filter: 'month',
                stream: false,
                presence_penalty: 0,
                frequency_penalty: 1
            })
        });

        if (!perplexityResponse.ok) {
            const errorText = await perplexityResponse.text();
            console.error('Perplexity API error:', {
                status: perplexityResponse.status,
                statusText: perplexityResponse.statusText,
                body: errorText
            });
            return new Response(JSON.stringify({
                error: 'Search service unavailable',
                details: `API returned ${perplexityResponse.status}: ${perplexityResponse.statusText}`
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const perplexityData = await perplexityResponse.json();

        // Transform Perplexity response to expected format
        const content = perplexityData.choices?.[0]?.message?.content || '';
        const citations = perplexityData.citations || [];

        // Filter out video URLs and low-quality sources
        const videoPatterns = ['youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com', 'instagram.com/reel'];
        const filteredCitations = citations.filter(citation => {
            try {
                const url = new URL(citation);
                return !videoPatterns.some(pattern => url.hostname.includes(pattern));
            } catch (e) {
                return false;
            }
        });

        // Create individual result items
        const results = [];

        // First result: AI answer (full content, not truncated)
        if (content) {
            results.push({
                title: '✨ AI Answer',
                snippet: content,
                url: 'https://www.perplexity.ai/search?q=' + encodeURIComponent(query),
                type: 'ai-answer'
            });
        }

        // Additional results from filtered citations (up to 9 more)
        if (filteredCitations.length > 0) {
            filteredCitations.slice(0, 9).forEach((citation, index) => {
                try {
                    const urlObj = new URL(citation);
                    const hostname = urlObj.hostname.replace('www.', '');

                    // Create a nice title from the hostname
                    const domainParts = hostname.split('.');
                    const mainDomain = domainParts.length > 1
                        ? domainParts[domainParts.length - 2]
                        : domainParts[0];
                    const capitalizedDomain = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);

                    results.push({
                        title: `📄 ${capitalizedDomain}`,
                        snippet: `Read more at ${hostname}`,
                        url: citation,
                        type: 'source'
                    });
                } catch (e) {
                    // Skip invalid URLs
                }
            });
        }

        // Format as search results
        const searchResults = {
            results: results.length > 0 ? results : [{
                title: 'No results found',
                snippet: 'Try a different search query',
                url: 'https://www.perplexity.ai',
                type: 'empty'
            }]
        };

        // Increment search count via existing endpoint
        await fetch('https://tabmangment.com/api/increment-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
        });

        // Return search results to client
        return new Response(JSON.stringify({
            success: true,
            data: searchResults,
            usage: {
                searchCount: usageData.searchCount + 1,
                remaining: usageData.remaining - 1
            }
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Perplexity search error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message,
            type: error.name
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
