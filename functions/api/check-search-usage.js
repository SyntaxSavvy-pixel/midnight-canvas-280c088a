// Cloudflare Pages Function: /api/check-search-usage
// Check user's AI search usage (24-hour rolling window)
// Uses Supabase REST API (no npm package required)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Parse request body
    const body = await request.json();
    const { email } = body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email is required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return new Response(JSON.stringify({
        success: false,
        error: 'Server configuration error'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Check if user is Pro/Premium using Supabase REST API
    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=isPro,isPremium`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (userResponse.ok) {
      const users = await userResponse.json();
      const user = users[0];

      // If user is Pro, return unlimited
      if (user && (user.isPro || user.isPremium)) {
        return new Response(JSON.stringify({
          success: true,
          searchCount: 0,
          canSearch: true,
          isPro: true
        }), {
          status: 200,
          headers: corsHeaders
        });
      }
    }

    // Calculate 24 hours ago timestamp
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Query search_usage table using Supabase REST API
    const searchResponse = await fetch(
      `${supabaseUrl}/rest/v1/search_usage?user_email=eq.${encodeURIComponent(email)}&searched_at=gte.${twentyFourHoursAgo}&select=id,searched_at&order=searched_at.desc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!searchResponse.ok) {
      console.error('Supabase query error:', await searchResponse.text());
      return new Response(JSON.stringify({
        success: false,
        error: 'Database error'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const searches = await searchResponse.json();

    // Calculate search count and eligibility
    const searchCount = searches?.length || 0;
    const canSearch = searchCount < 5;
    const remaining = Math.max(0, 5 - searchCount);

    // Calculate when limit resets (earliest search + 24h)
    let resetsAt = null;
    if (searches && searches.length > 0) {
      const oldestSearch = searches[searches.length - 1];
      const resetTime = new Date(oldestSearch.searched_at);
      resetTime.setHours(resetTime.getHours() + 24);
      resetsAt = resetTime.toISOString();
    }

    // Return response
    return new Response(JSON.stringify({
      success: true,
      searchCount,
      canSearch,
      remaining,
      resetsAt,
      isPro: false
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}
