// Enhanced /api/me endpoint for extension with Supabase
// Extension calls: GET /api/me?email=user@example.com
// Returns: { email, plan: "pro"|"free" }

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Handle POST requests for authentication
    if (event.httpMethod === 'POST') {
        try {
            const { action, name, email, password } = JSON.parse(event.body || '{}');

            // Simple validation
            if (!email || !password) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Email and password are required'
                    })
                };
            }

            if (action === 'register') {
                if (!name) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            message: 'Name is required for registration'
                        })
                    };
                }

                if (password.length < 8) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            message: 'Password must be at least 8 characters'
                        })
                    };
                }

                // Save user to Supabase
                try {
                    const { saveUser } = await import('../../lib/database-supabase.js');
                    const userData = {
                        userId: email,
                        email: email,
                        name: name,
                        isPro: false,
                        subscriptionStatus: 'free'
                    };

                    const savedUser = await saveUser(userData);

                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            message: 'Account created successfully',
                            user: {
                                email: savedUser.email,
                                name: savedUser.name,
                                isPro: savedUser.isPro,
                                subscriptionStatus: savedUser.subscriptionStatus,
                                plan: savedUser.isPro ? 'pro' : 'free'
                            }
                        })
                    };
                } catch (dbError) {
                    console.error('❌ Database error during registration:', dbError);
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            message: 'Failed to create account. Please try again.'
                        })
                    };
                }
            }

            if (action === 'login') {
                // Accept demo credentials or any password 8+ chars
                const isDemoUser = email === 'demo@example.com' && password === 'demo123';

                if (!isDemoUser && password.length < 8) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            message: 'Invalid credentials'
                        })
                    };
                }

                // Get or create user in Supabase
                try {
                    const { getUser, saveUser } = await import('../../lib/database-supabase.js');
                    let user = await getUser(email);

                    if (!user) {
                        // Create user if they don't exist
                        const newUserData = {
                            userId: email,
                            email: email,
                            name: isDemoUser ? 'Demo User' : email.split('@')[0],
                            isPro: false,
                            subscriptionStatus: 'free'
                        };
                        user = await saveUser(newUserData);
                    }

                    const token = Buffer.from(JSON.stringify({
                        email: email,
                        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
                    })).toString('base64');

                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            message: 'Login successful',
                            user: {
                                email: user.email,
                                name: user.name,
                                isPro: user.isPro,
                                subscriptionStatus: user.subscriptionStatus,
                                plan: user.isPro ? 'pro' : 'free'
                            },
                            token: token
                        })
                    };
                } catch (dbError) {
                    console.error('❌ Database error during login:', dbError);
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            message: 'Login failed. Please try again.'
                        })
                    };
                }
            }

            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Invalid action. Use "login" or "register"'
                })
            };

        } catch (error) {
            console.error('Auth error:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Authentication failed'
                })
            };
        }
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const email = event.queryStringParameters?.email;

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Email parameter required'
                })
            };
        }

        console.log('🔍 Checking plan for:', email);

        // Get user from Supabase database
        let user = null;
        try {
            const { getUser } = await import('../../lib/database-supabase.js');
            user = await getUser(email);
        } catch (dbError) {
            console.error('❌ Database error:', dbError);
        }

        if (!user) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    email: email,
                    plan: 'free',
                    found: false,
                    isPro: false,
                    subscriptionStatus: 'free'
                })
            };
        }

        // Check if subscription is still valid
        let currentlyPro = user.isPro;
        if (user.isPro && user.currentPeriodEnd) {
            const now = new Date();
            const periodEnd = new Date(user.currentPeriodEnd);

            if (now > periodEnd && user.subscriptionStatus !== 'active') {
                // Subscription expired
                currentlyPro = false;
                try {
                    const { updateUser } = await import('../../lib/database-supabase.js');
                    await updateUser(email, {
                        isPro: false,
                        subscriptionStatus: 'expired'
                    });
                } catch (updateError) {
                    console.error('❌ Error updating expired subscription:', updateError);
                }
            }
        }

        // Response with all necessary data for extension
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                email: user.email,
                name: user.name || email.split('@')[0],
                plan: currentlyPro ? 'pro' : 'free',
                isPro: currentlyPro,
                subscriptionStatus: user.subscriptionStatus || 'free',
                currentPeriodEnd: user.currentPeriodEnd,
                stripeCustomerId: user.stripeCustomerId,
                stripeSubscriptionId: user.stripeSubscriptionId,
                found: true
            })
        };

    } catch (error) {
        console.error('❌ Error checking user plan:', error);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                email: event.queryStringParameters?.email || 'unknown',
                plan: 'free',
                isPro: false,
                subscriptionStatus: 'free',
                found: false,
                error: 'Lookup failed'
            })
        };
    }
};