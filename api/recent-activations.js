// Get recent Pro activations for extension polling
// This helps when we can't match exact user emails
// Path: /api/recent-activations.js

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🔍 Getting recent Pro activations...');

    const recentActivations = [];
    const lastHour = Date.now() - (60 * 60 * 1000); // 1 hour ago

    // Get recent activations from KV
    try {
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const { kv } = await import('@vercel/kv');
        const userKeys = await kv.keys('user:*');

        for (const key of userKeys) {
          const user = await kv.get(key);
          if (user && user.isPro && user.proActivatedAt) {
            const activatedTime = new Date(user.proActivatedAt).getTime();
            if (activatedTime > lastHour) {
              recentActivations.push({
                email: user.email,
                userId: user.userId,
                activatedAt: user.proActivatedAt,
                activatedVia: user.activatedVia,
                stripeSessionId: user.stripeSessionId,
                userSessionId: user.userSessionId
              });
            }
          }
        }

        // Sort by activation time (newest first)
        recentActivations.sort((a, b) => new Date(b.activatedAt) - new Date(a.activatedAt));
      }
    } catch (kvError) {
      console.log('⚠️ KV error:', kvError.message);
    }

    console.log(`✅ Found ${recentActivations.length} recent activations`);

    return res.status(200).json({
      success: true,
      count: recentActivations.length,
      activations: recentActivations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Recent activations error:', error);

    return res.status(200).json({
      success: false,
      error: error.message,
      activations: [],
      timestamp: new Date().toISOString()
    });
  }
}