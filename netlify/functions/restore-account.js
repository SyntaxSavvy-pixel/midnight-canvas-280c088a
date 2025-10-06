// Netlify Function to restore account marked for deletion
// POST /api/restore-account
// Body: { userId, email }

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://voislxlhfepnllamagxm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
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
        const { userId, email } = JSON.parse(event.body);

        console.log('♻️ RESTORE ACCOUNT REQUEST - userId:', userId, 'email:', email);

        if (!userId || !email) {
            console.error('❌ Missing required fields');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'userId and email are required'
                })
            };
        }

        // Initialize Supabase admin client with service role key
        if (!supabaseServiceKey) {
            console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured in environment');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Server configuration error - missing service key'
                })
            };
        }

        console.log('✅ Service key is configured');
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Remove deletion metadata to restore account
        console.log('♻️ Removing deletion schedule from user metadata...');

        const { data: userData, error: fetchError } = await supabase.auth.admin.getUserById(userId);

        if (fetchError) {
            console.error('❌ Error fetching user:', fetchError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to fetch user data',
                    details: fetchError.message
                })
            };
        }

        // Get existing metadata and remove deletion fields
        const currentMetadata = userData.user.user_metadata || {};
        delete currentMetadata.deletion_scheduled_at;
        delete currentMetadata.deletion_requested_at;

        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
            userId,
            {
                user_metadata: currentMetadata
            }
        );

        if (updateError) {
            console.error('❌ Error restoring account:', updateError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to restore account',
                    details: updateError.message
                })
            };
        }

        console.log('✅ Account restored successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Account restored successfully',
                userId: userId,
                email: email,
                restored: true
            })
        };

    } catch (error) {
        console.error('❌ CRITICAL ERROR in restore-account handler:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                details: error.message
            })
        };
    }
};
