// Cloudflare Pages Function: /api/sync-user
// Syncs new OAuth user to users table (Cloudflare version)
// Uses Supabase REST API (no npm package required)

import { isAdmin, getAdminPrivileges } from './admin-config.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const startTime = Date.now();

    // Parse request body
    const body = await request.json();
    const { email, name, userId, provider } = body;

    console.log(`[sync-user] Processing sync for email: ${email}, provider: ${provider}`);

    // Validate input
    if (!email || !userId) {
      console.error('[sync-user] Validation failed: Missing email or userId');
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
      console.error('[sync-user] Configuration error: Missing environment variables', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
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
    console.log(`[sync-user] Checking if user exists: ${email}`);
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
        console.log(`[sync-user] User already exists: ${email}`);
      } else {
        console.log(`[sync-user] User not found, will create: ${email}`);
      }
    } else {
      console.error(`[sync-user] Failed to check user existence: ${existingUserResponse.status}`);
    }

    // ==============================================================
    // STEP 2: Create user in users_auth table if doesn't exist
    // ==============================================================
    if (!userExists) {
      // Check if user is admin and grant privileges
      const adminPrivileges = getAdminPrivileges(email);
      console.log(`[sync-user] Creating new user with privileges:`, {
        email,
        isAdmin: adminPrivileges.isAdmin,
        isPro: adminPrivileges.isPro,
        planType: adminPrivileges.planType
      });

      // For admin users, set a far-future billing date (100 years from now)
      let nextBillingDate = null;
      if (adminPrivileges.isAdmin) {
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 100);
        nextBillingDate = farFuture.toISOString();
      }

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
            is_pro: adminPrivileges.isPro,
            plan_type: adminPrivileges.planType,
            subscription_status: adminPrivileges.isAdmin ? 'active' : 'inactive',
            next_billing_date: nextBillingDate
          })
        }
      );

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        // Only fail if it's not a duplicate key error
        if (!errorText.includes('duplicate key') && !errorText.includes('unique constraint')) {
          console.error('[sync-user] Failed to create user in users_auth table:', errorText);
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create user record',
            details: errorText
          }), {
            status: 500,
            headers: corsHeaders
          });
        } else {
          console.log(`[sync-user] User already exists (duplicate key), continuing...`);
        }
      } else {
        console.log(`[sync-user] Successfully created user: ${email}`);
      }
    }

    // Get admin status for response
    const adminPrivileges = getAdminPrivileges(email);
    const duration = Date.now() - startTime;

    console.log(`[sync-user] Successfully synced user: ${email} (took ${duration}ms)`);

    return new Response(JSON.stringify({
      success: true,
      message: 'User synced successfully',
      user: {
        id: userId,
        email: email,
        isAdmin: adminPrivileges.isAdmin,
        isPro: adminPrivileges.isPro
      }
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
