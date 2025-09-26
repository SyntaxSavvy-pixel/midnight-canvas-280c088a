// Simple API endpoint to activate Pro features
// Path: /api/activate.js

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🎯 Pro activation request received');

    const { email, sessionId, userId } = req.body;
    const userIdentifier = email || userId;

    if (!userIdentifier) {
      return res.status(400).json({
        success: false,
        error: 'User identifier required',
        message: 'Please provide email or userId'
      });
    }

    console.log('👤 Activating Pro for:', userIdentifier);

    // Create Pro user data
    const proUserData = {
      userId: userIdentifier,
      email: email || userIdentifier,
      isPro: true,
      planType: 'pro',
      status: 'active',
      subscriptionStatus: 'active',
      proActivatedAt: new Date().toISOString(),
      activatedVia: 'manual_api',
      sessionId: sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Try to save to KV if available
    let saved = false;
    try {
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const { kv } = await import('@vercel/kv');
        await kv.set(`user:${userIdentifier}`, proUserData);

        // Also save by email if different
        if (email && email !== userIdentifier) {
          await kv.set(`user:${email}`, proUserData);
        }

        saved = true;
        console.log('✅ Pro user saved to KV:', userIdentifier);
      } else {
        console.log('⚠️ KV not configured - activation request received but not persisted');
      }
    } catch (kvError) {
      console.error('⚠️ KV save error:', kvError.message);
    }

    const response = {
      success: true,
      message: 'Pro features activated successfully',
      timestamp: new Date().toISOString(),
      data: {
        user: userIdentifier,
        isPro: true,
        planType: 'pro',
        activatedAt: proUserData.proActivatedAt,
        saved: saved,
        sessionId: sessionId
      }
    };

    console.log('🎉 Pro activation successful:', userIdentifier);
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Activation error:', error);

    return res.status(200).json({
      success: false,
      error: error.message,
      message: 'Activation failed but request processed',
      timestamp: new Date().toISOString()
    });
  }
}