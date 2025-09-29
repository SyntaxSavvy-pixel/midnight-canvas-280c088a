// Test Supabase connection endpoint
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test dynamic import of Supabase functions
    const { getUser } = await import('../lib/database-supabase.js');

    // Test with a demo email that likely doesn't exist
    const testEmail = 'test-connection@example.com';
    const user = await getUser(testEmail);

    return res.status(200).json({
      success: true,
      message: 'Supabase connection successful',
      testEmail: testEmail,
      userFound: !!user,
      timestamp: new Date().toISOString(),
      supabaseUrl: process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);

    return res.status(500).json({
      success: false,
      message: 'Supabase connection failed',
      error: error.message,
      timestamp: new Date().toISOString(),
      supabaseUrl: process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  }
}