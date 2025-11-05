// Cloudflare Pages Function: /api/remove-device
// Removes a device from user's authorized devices list
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
    const { email, device_id } = body;

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email is required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    if (!device_id || typeof device_id !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Device ID is required'
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
    // STEP 1: Verify user exists and get user ID
    // ==============================================================
    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!userResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const users = await userResponse.json();
    const user = users[0];

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const userId = user.id;

    // ==============================================================
    // STEP 2: Verify device exists and belongs to this user
    // ==============================================================
    const deviceCheckResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_devices?user_id=eq.${userId}&device_id=eq.${encodeURIComponent(device_id)}&select=id,browser_info`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!deviceCheckResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Database error'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const devices = await deviceCheckResponse.json();

    if (!devices || devices.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Device not found or does not belong to this user'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // ==============================================================
    // STEP 3: Delete the device
    // ==============================================================
    const deleteResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_devices?user_id=eq.${userId}&device_id=eq.${encodeURIComponent(device_id)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      }
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to remove device',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // ==============================================================
    // STEP 4: Get remaining device count
    // ==============================================================
    const remainingDevicesResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_devices?user_id=eq.${userId}&select=id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let remainingCount = 0;
    if (remainingDevicesResponse.ok) {
      const remainingDevices = await remainingDevicesResponse.json();
      remainingCount = remainingDevices?.length || 0;
    }

    // ==============================================================
    // STEP 5: Return success
    // ==============================================================
    return new Response(JSON.stringify({
      success: true,
      message: 'Device removed successfully',
      remainingDevices: remainingCount
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
