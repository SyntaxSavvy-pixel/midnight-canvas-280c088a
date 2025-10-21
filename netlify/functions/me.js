// Enhanced /api/me endpoint for extension with Supabase
// Extension calls: GET /api/me?email=user@example.com
// Returns: { email, plan: "pro"|"free" }

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
                    const userData = {
                        email: email,
                        name: name,
                        is_pro: false,
                        subscription_status: 'free',
                        password_hash: password // Simple storage for now - in production should be hashed
                    };

                    const { data, error } = await supabase
                        .from('users_auth')
                        .upsert(userData)
                        .select()
                        .single();

                    if (error) throw error;

                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            message: 'Account created successfully',
                            user: {
                                email: data.email,
                                name: data.name,
                                isPro: data.is_pro,
                                subscriptionStatus: data.subscription_status,
                                plan: data.is_pro ? 'pro' : 'free'
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

                // For testing purposes, allow any email with password 8+ chars or demo user
                if (!isDemoUser && password.length < 8) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            message: 'Password must be at least 8 characters'
                        })
                    };
                }

                // Get or create user in Supabase
                try {
                    let { data: user, error } = await supabase
                        .from('users_auth')
                        .select('*')
                        .eq('email', email)
                        .single();

                    if (error && error.code !== 'PGRST116') {
                        throw error;
                    }

                    if (!user) {
                        // Create user if they don't exist
                        const newUserData = {
                            email: email,
                            name: isDemoUser ? 'Demo User' : email.split('@')[0],
                            is_pro: false,
                            subscription_status: 'free',
                            password_hash: password // Simple storage for now - in production should be hashed
                        };

                        const { data: newUser, error: createError } = await supabase
                            .from('users_auth')
                            .insert(newUserData)
                            .select()
                            .single();

                        if (createError) throw createError;
                        user = newUser;
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
                                isPro: user.is_pro,
                                subscriptionStatus: user.subscription_status,
                                plan: user.is_pro ? 'pro' : 'free'
                            },
                            token: token
                        })
                    };
                } catch (dbError) {
                    console.error('❌ Database error during login:', dbError);
                    console.error('❌ Error details:', {
                        message: dbError.message,
                        code: dbError.code,
                        details: dbError.details,
                        hint: dbError.hint
                    });

                    // If it's a table doesn't exist error, provide a helpful message
                    if (dbError.message && dbError.message.includes('relation "users" does not exist')) {
                        return {
                            statusCode: 500,
                            headers,
                            body: JSON.stringify({
                                success: false,
                                message: 'Database not set up. Please create the users table in Supabase.'
                            })
                        };
                    }

                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            message: `Database error: ${dbError.message || 'Login failed. Please try again.'}`
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


        // Get user from Supabase database
        let user = null;
        try {
            const { data, error } = await supabase
                .from('users_auth')
                .select('*')
                .eq('email', email)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            user = data;
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
        let currentlyPro = user.is_pro;
        if (user.is_pro && user.current_period_end) {
            const now = new Date();
            const periodEnd = new Date(user.current_period_end);

            if (now > periodEnd && user.subscription_status !== 'active') {
                // Subscription expired
                currentlyPro = false;
                try {
                    await supabase
                        .from('users_auth')
                        .update({
                            is_pro: false,
                            subscription_status: 'expired'
                        })
                        .eq('email', email);
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
                status: user.subscription_status || 'free', // For popup compatibility
                subscriptionStatus: user.subscription_status || 'free',
                subscriptionId: user.stripe_subscription_id,
                currentPeriodEnd: user.current_period_end,
                stripeCustomerId: user.stripe_customer_id,
                stripeSubscriptionId: user.stripe_subscription_id,
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