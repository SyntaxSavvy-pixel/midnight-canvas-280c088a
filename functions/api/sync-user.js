// Cloudflare Pages Function: /api/sync-user
// Syncs new OAuth user to users table (Cloudflare version)
// Uses Supabase REST API (no npm package required)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Parse request body
    const body = await request.json();
    const { email, name, userId, provider } = body;

    // Validate input
    if (!email || !userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email and userId are required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Server configuration error'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // ==============================================================
    // STEP 1: Check if user already exists
    // ==============================================================
    const existingUserResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,email`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (existingUserResponse.ok) {
      const existingUsers = await existingUserResponse.json();
      if (existingUsers && existingUsers.length > 0) {
        // User already exists - return success
        return new Response(JSON.stringify({
          success: true,
          message: 'User already exists',
          user: existingUsers[0]
        }), {
          status: 200,
          headers: corsHeaders
        });
      }
    }

    // ==============================================================
    // STEP 2: Create new user
    // ==============================================================
    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/users`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: userId,
          email: email,
          name: name || email.split('@')[0],
          isPro: false,
          isPremium: false,
          provider: provider || 'email',
          created_at: new Date().toISOString()
        })
      }
    );

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('Supabase insert error:', errorText);

      // Check if error is duplicate key (user already exists)
      if (errorText.includes('duplicate key') || errorText.includes('unique constraint')) {
        return new Response(JSON.stringify({
          success: true,
          message: 'User already exists'
        }), {
          status: 200,
          headers: corsHeaders
        });
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create user record',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const newUser = await insertResponse.json();

    return new Response(JSON.stringify({
      success: true,
      message: 'User synced successfully',
      user: Array.isArray(newUser) ? newUser[0] : newUser
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Sync user error:', error);
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
