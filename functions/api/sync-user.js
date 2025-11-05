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
    // STEP 1: Check if user exists in users_auth table
    // ==============================================================
    const existingUserResponse = await fetch(
      `${supabaseUrl}/rest/v1/users_auth?email=eq.${encodeURIComponent(email)}&select=id,email`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let userExists = false;
    if (existingUserResponse.ok) {
      const existingUsers = await existingUserResponse.json();
      if (existingUsers && existingUsers.length > 0) {
        userExists = true;
      }
    }

    // ==============================================================
    // STEP 2: Create user in users_auth table if doesn't exist
    // ==============================================================
    if (!userExists) {
      const insertResponse = await fetch(
        `${supabaseUrl}/rest/v1/users_auth`,
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
            is_pro: false,
            plan_type: 'free',
            subscription_status: 'inactive'
          })
        }
      );

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        // Only fail if it's not a duplicate key error
        if (!errorText.includes('duplicate key') && !errorText.includes('unique constraint')) {
          console.error('Failed to create user in users_auth table:', errorText);
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create user record',
            details: errorText
          }), {
            status: 500,
            headers: corsHeaders
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'User synced successfully',
      user: { id: userId, email: email }
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
