// Netlify Function to mark account for deletion (24-hour grace period)
// POST /api/delete-account
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

        console.log('🗑️ MARK ACCOUNT FOR DELETION');

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

        // Mark user for deletion in 24 hours by updating user metadata
        const deletionTime = new Date();
        deletionTime.setHours(deletionTime.getHours() + 24);

        console.log('⏰ Scheduling deletion for:', deletionTime.toISOString());

        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
            userId,
            {
                user_metadata: {
                    deletion_scheduled_at: deletionTime.toISOString(),
                    deletion_requested_at: new Date().toISOString()
                }
            }
        );

        if (updateError) {
            console.error('❌ Error marking user for deletion:', updateError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to schedule account deletion',
                    details: updateError.message
                })
            };
        }

        console.log('✅ User marked for deletion in 24 hours');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Account scheduled for deletion in 24 hours',
                userId: userId,
                email: email,
                deletionScheduledAt: deletionTime.toISOString(),
                canRestore: true
            })
        };

    } catch (error) {
        console.error('❌ CRITICAL ERROR in delete-account handler:', error);
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
