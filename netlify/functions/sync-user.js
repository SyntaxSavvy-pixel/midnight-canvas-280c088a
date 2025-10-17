// Netlify Function: /api/sync-user
// Syncs new user to users_auth table on signup

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email, name, userId, provider } = JSON.parse(event.body);

        if (!email || !userId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email and userId are required' })
            };
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users_auth')
            .select('id, email')
            .eq('email', email)
            .single();

        if (existingUser) {
            // User already exists, just return success
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'User already exists',
                    user: existingUser
                })
            };
        }

        // Insert new user
        const { data: newUser, error: insertError } = await supabase
            .from('users_auth')
            .insert([
                {
                    id: userId,
                    email: email,
                    name: name || email.split('@')[0],
                    is_pro: false,
                    plan_type: 'free',
                    subscription_status: 'inactive',
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Insert error:', insertError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Failed to create user record',
                    details: insertError.message
                })
            };
        }


        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'User synced successfully',
                user: newUser
            })
        };

    } catch (error) {
        console.error('❌ Sync user error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                details: error.message
            })
        };
    }
};
