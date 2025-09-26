// Create user session before payment
// This links extension user to Stripe payment
// Path: /api/create-session.js

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
    console.log('🎯 Creating user session for payment...');

    const { userEmail, extensionId, tabId } = req.body;

    // Generate unique session ID
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Create session data
    const sessionData = {
      sessionId: sessionId,
      userEmail: userEmail || null,
      extensionId: extensionId || null,
      tabId: tabId || null,
      createdAt: new Date().toISOString(),
      status: 'pending',
      paymentCompleted: false
    };

    console.log('📝 Session data:', sessionData);

    // Store in KV if available
    try {
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const { kv } = await import('@vercel/kv');
        await kv.set(`session:${sessionId}`, sessionData, { ex: 3600 }); // Expire in 1 hour
        console.log('✅ Session stored in KV');
      }
    } catch (kvError) {
      console.log('⚠️ KV storage failed (continuing):', kvError.message);
    }

    return res.status(200).json({
      success: true,
      sessionId: sessionId,
      message: 'Session created successfully'
    });

  } catch (error) {
    console.error('❌ Session creation error:', error);

    return res.status(200).json({
      success: false,
      sessionId: 'fallback_' + Date.now(),
      error: error.message,
      message: 'Session creation failed, using fallback'
    });
  }
}