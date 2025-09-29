// Enhanced /api/me endpoint for extension with Supabase
// Extension calls: GET /api/me?email=user@example.com
// Returns: { email, plan: "pro"|"free" }

import { getUser, saveUser, updateUser } from '../lib/database-supabase.js';

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

                // Save user to Supabase
                try {
                    const userData = {
                        userId: email,
                        email: email,
                        name: name,
                        isPro: false,
                        subscriptionStatus: 'free'
                    };

                    const savedUser = await saveUser(userData);

                    return res.status(200).json({
                        success: true,
                        message: 'Account created successfully',
                        user: {
                            email: savedUser.email,
                            name: savedUser.name,
                            isPro: savedUser.isPro,
                            subscriptionStatus: savedUser.subscriptionStatus,
                            plan: savedUser.isPro ? 'pro' : 'free'
                        }
                    });
                } catch (dbError) {
                    console.error('❌ Database error during registration:', dbError);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create account. Please try again.'
                    });
                }
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

                // Get or create user in Supabase
                try {
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

                    return res.status(200).json({
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
                    });
                } catch (dbError) {
                    console.error('❌ Database error during login:', dbError);
                    return res.status(500).json({
                        success: false,
                        message: 'Login failed. Please try again.'
                    });
                }
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

        // Get user from Supabase database
        let user = null;
        try {
            user = await getUser(email);
        } catch (dbError) {
            console.error('❌ Database error:', dbError);
        }

        if (!user) {
            return res.status(200).json({
                email: email,
                plan: 'free',
                found: false,
                isPro: false,
                subscriptionStatus: 'free'
            });
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
        return res.status(200).json({
            email: user.email,
            name: user.name || email.split('@')[0],
            plan: currentlyPro ? 'pro' : 'free',
            isPro: currentlyPro,
            subscriptionStatus: user.subscriptionStatus || 'free',
            currentPeriodEnd: user.currentPeriodEnd,
            stripeCustomerId: user.stripeCustomerId,
            stripeSubscriptionId: user.stripeSubscriptionId,
            found: true
        });

    } catch (error) {
        console.error('❌ Error checking user plan:', error);

        return res.status(200).json({
            email: req.query.email || 'unknown',
            plan: 'free',
            isPro: false,
            subscriptionStatus: 'free',
            found: false,
            error: 'Lookup failed'
        });
    }
}