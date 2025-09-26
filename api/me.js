// Simple /api/me endpoint for extension
// Extension calls: GET /api/me?email=user@example.com
// Returns: { email, plan: "pro"|"free" }

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Handle POST requests for authentication
    if (req.method === 'POST') {
        try {
            const { action, name, email, password } = req.body;

            // Simple validation
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            if (action === 'register') {
                if (!name) {
                    return res.status(400).json({
                        success: false,
                        message: 'Name is required for registration'
                    });
                }

                if (password.length < 8) {
                    return res.status(400).json({
                        success: false,
                        message: 'Password must be at least 8 characters'
                    });
                }

                // For demo: accept all registrations
                const userData = {
                    userId: email,
                    email: email,
                    name: name,
                    isPro: false,
                    planType: 'free',
                    status: 'active',
                    createdAt: new Date().toISOString()
                };

                return res.status(200).json({
                    success: true,
                    message: 'Account created successfully',
                    user: userData
                });
            }

            if (action === 'login') {
                // Accept demo credentials or any password 8+ chars
                const isDemoUser = email === 'demo@example.com' && password === 'demo123';

                if (!isDemoUser && password.length < 8) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials'
                    });
                }

                const userData = {
                    userId: email,
                    email: email,
                    name: isDemoUser ? 'Demo User' : email.split('@')[0],
                    isPro: false,
                    planType: 'free',
                    status: 'active',
                    lastLoginAt: new Date().toISOString()
                };

                const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

                return res.status(200).json({
                    success: true,
                    message: 'Login successful',
                    user: userData,
                    token: token
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Invalid action. Use "login" or "register"'
            });

        } catch (error) {
            console.error('Auth error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authentication failed'
            });
        }
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                error: 'Email parameter required'
            });
        }

        console.log('🔍 Checking plan for:', email);

        // Get user from database
        let user = null;
        if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
            const { kv } = await import('@vercel/kv');
            user = await kv.get(`user:${email}`);
        }

        if (!user) {
            return res.status(200).json({
                email: email,
                plan: 'free',
                found: false
            });
        }

        // Simple response - just what the extension needs
        return res.status(200).json({
            email: user.email,
            name: user.name,
            plan: user.isPro ? 'pro' : 'free',
            found: true
        });

    } catch (error) {
        console.error('❌ Error checking user plan:', error);

        return res.status(200).json({
            email: req.query.email || 'unknown',
            plan: 'free',
            found: false,
            error: 'Lookup failed'
        });
    }
}