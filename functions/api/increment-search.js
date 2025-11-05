// Cloudflare Pages Function: /api/increment-search
// Record a new AI search in the database
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
    let isPro = false;
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
      isPro = user && (user.isPro || user.isPremium);
    }

    // Insert new search record using Supabase REST API
    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/search_usage`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_email: email,
          searched_at: new Date().toISOString()
        })
      }
    );

    if (!insertResponse.ok) {
      console.error('Supabase insert error:', await insertResponse.text());
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to record search'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Get updated search count (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const countResponse = await fetch(
      `${supabaseUrl}/rest/v1/search_usage?user_email=eq.${encodeURIComponent(email)}&searched_at=gte.${twentyFourHoursAgo}&select=id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let searchCount = 1;
    if (countResponse.ok) {
      const searches = await countResponse.json();
      searchCount = searches?.length || 1;
    }

    // Calculate counts
    const remaining = isPro ? 999 : Math.max(0, 5 - searchCount);
    const limitReached = !isPro && searchCount >= 5;

    // Return response
    return new Response(JSON.stringify({
      success: true,
      message: 'Search recorded successfully',
      searchCount,
      remaining,
      limitReached,
      isPro
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
