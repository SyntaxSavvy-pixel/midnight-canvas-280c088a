// Cloudflare Pages Function: /api/authorize-device
// Authorizes device access and enforces device limits
// Uses Supabase REST API (no npm package required)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Device limits configuration
const DEVICE_LIMITS = {
  FREE: 2,
  PRO: 3
};

// Inactivity period (30 days in milliseconds)
const INACTIVITY_PERIOD = 30 * 24 * 60 * 60 * 1000;

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Parse request body
    const body = await request.json();
    const { email, device_id, device_name, device_fingerprint, metadata } = body;

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
    // STEP 1: Get user's plan type (free or pro)
    // ==============================================================
    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/users_auth?email=eq.${encodeURIComponent(email)}&select=id,is_pro,plan_type`,
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
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

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
    const isPro = user.is_pro || user.plan_type === 'pro';
    const planType = isPro ? 'pro' : 'free';
    const maxDevices = isPro ? DEVICE_LIMITS.PRO : DEVICE_LIMITS.FREE;

    // ==============================================================
    // STEP 2: Check if this device already exists
    // ==============================================================
    const existingDeviceResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_devices?user_id=eq.${userId}&device_id=eq.${encodeURIComponent(device_id)}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!existingDeviceResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Database error'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const existingDevices = await existingDeviceResponse.json();

    // If device exists, update last_active and return success
    if (existingDevices && existingDevices.length > 0) {
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_devices?user_id=eq.${userId}&device_id=eq.${encodeURIComponent(device_id)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            last_seen: new Date().toISOString(),
            browser_info: metadata || {}
          })
        }
      );

      if (!updateResponse.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to update device'
        }), {
          status: 500,
          headers: corsHeaders
        });
      }

      return new Response(JSON.stringify({
        success: true,
        authorized: true,
        isExisting: true,
        message: 'Device authorized',
        deviceCount: 1, // Will be updated in frontend
        maxDevices
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // ==============================================================
    // STEP 3: New device - Check device limit
    // ==============================================================

    // Get all active devices for this user
    const allDevicesResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_devices?user_id=eq.${userId}&select=id,device_id,last_seen`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!allDevicesResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Database error'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const allDevices = await allDevicesResponse.json();
    const activeDeviceCount = allDevices ? allDevices.length : 0;

    // Check if user has reached device limit
    if (activeDeviceCount >= maxDevices) {
      return new Response(JSON.stringify({
        success: false,
        authorized: false,
        error: 'Device limit reached',
        message: `You've reached your device limit (${maxDevices} devices). ${isPro ? 'Please remove a device to continue.' : 'Upgrade to Pro for more devices.'}`,
        deviceCount: activeDeviceCount,
        maxDevices,
        planType
      }), {
        status: 403,
        headers: corsHeaders
      });
    }

    // ==============================================================
    // STEP 4: Register new device
    // ==============================================================
    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_devices`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_id: userId,
          device_id,
          device_fingerprint: device_fingerprint || device_id,
          browser_info: {
            deviceName: device_name || 'Unknown Device',
            ...metadata
          },
          last_seen: new Date().toISOString()
        })
      }
    );

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to register device',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // ==============================================================
    // STEP 5: Return success
    // ==============================================================
    return new Response(JSON.stringify({
      success: true,
      authorized: true,
      isNew: true,
      message: 'New device registered successfully',
      deviceCount: activeDeviceCount + 1,
      maxDevices,
      planType
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
