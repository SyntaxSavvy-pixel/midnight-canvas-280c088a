// Simple test endpoint to verify API is working
// Path: /api/test.js

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🧪 Test endpoint called:', {
      method: req.method,
      url: req.url,
      query: req.query,
      timestamp: new Date().toISOString()
    });

    const response = {
      success: true,
      message: 'API is working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      query: req.query,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasKV: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
        hasStripe: !!process.env.STRIPE_SECRET_KEY
      }
    };

    console.log('✅ Test endpoint response:', response);
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Test endpoint error:', error);

    return res.status(200).json({
      success: false,
      error: error.message,
      message: 'Test endpoint failed but responded',
      timestamp: new Date().toISOString()
    });
  }
}