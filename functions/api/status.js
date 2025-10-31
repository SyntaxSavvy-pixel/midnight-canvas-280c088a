// Cloudflare Pages Function: /api/status
// Simple health check endpoint

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

export async function onRequestOptions() {
    return new Response(null, {
        status: 200,
        headers: corsHeaders
    });
}

export async function onRequestGet() {
    return new Response(JSON.stringify({
        status: 'ok',
        message: 'TabManagement API is running',
        timestamp: new Date().toISOString()
    }), {
        status: 200,
        headers: corsHeaders
    });
}
