// Simple working API endpoint for payment status checks
// Path: /api/status.js

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('📡 API status endpoint called:', req.method, req.url);

    // Get user identifier
    const userIdentifier = req.query.user || req.query.email || 'unknown';
    console.log('👤 Checking status for:', userIdentifier);

    // Simple response - start with free plan
    let isPro = false;
    let userData = null;

    try {
      // Try to check Vercel KV if available
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const { kv } = await import('@vercel/kv');
        userData = await kv.get(`user:${userIdentifier}`);

        if (userData) {
          isPro = userData.isPro === true;
          console.log('✅ Found user in KV:', userIdentifier, 'isPro:', isPro);
        } else {
          console.log('ℹ️ User not found in KV, checking by email...');
          // Also try to find by email if userIdentifier looks like an email
          if (userIdentifier.includes('@')) {
            const keys = await kv.keys('user:*');
            for (const key of keys) {
              const user = await kv.get(key);
              if (user && user.email === userIdentifier) {
                userData = user;
                isPro = user.isPro === true;
                console.log('✅ Found user by email:', userIdentifier, 'isPro:', isPro);
                break;
              }
            }
          }
        }
      } else {
        console.log('⚠️ KV not configured, using default free status');
      }
    } catch (kvError) {
      console.error('⚠️ KV error (continuing with free status):', kvError.message);
    }

    // Build response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      user: userIdentifier,
      isPro: isPro,
      planType: isPro ? 'pro' : 'free',
      status: isPro ? 'active' : 'free',
      subscriptionStatus: userData?.subscriptionStatus || 'free',
      data: userData || {
        email: userIdentifier,
        userId: userIdentifier,
        isPro: false,
        planType: 'free',
        createdAt: new Date().toISOString()
      }
    };

    console.log('📊 Returning status:', {
      user: userIdentifier,
      isPro: isPro,
      hasUserData: !!userData
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ API error:', error);

    return res.status(200).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      user: req.query.user || req.query.email || 'unknown',
      isPro: false,
      planType: 'free',
      status: 'error'
    });
  }
}