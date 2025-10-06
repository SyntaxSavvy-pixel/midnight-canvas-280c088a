// Netlify Function to delete user account
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

        console.log('🗑️ DELETE ACCOUNT REQUEST - userId:', userId, 'email:', email);

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
        console.log('🔧 Creating Supabase admin client...');

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        console.log('🗑️ Attempting to delete user from Supabase Auth...');

        // Delete user from auth.users table (this cascades to related tables)
        const { data: deleteData, error: deleteError } = await supabase.auth.admin.deleteUser(
            userId
        );

        if (deleteError) {
            console.error('❌ Error deleting user from Supabase Auth:', deleteError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to delete user account',
                    details: deleteError.message,
                    code: deleteError.code
                })
            };
        }

        console.log('✅ User deleted successfully from Supabase Auth');

        // Also delete from custom users table if it exists
        try {
            console.log('🗑️ Attempting to delete from users table...');
            const { error: tableError } = await supabase
                .from('users')
                .delete()
                .eq('email', email);

            if (tableError) {
                console.log('⚠️ Could not delete from users table:', tableError.message);
                // Not critical, continue
            } else {
                console.log('✅ User data deleted from users table');
            }
        } catch (tableErr) {
            console.log('⚠️ Users table deletion error:', tableErr);
            // Not critical, continue
        }

        console.log('✅✅✅ ACCOUNT DELETION COMPLETED SUCCESSFULLY ✅✅✅');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Account deleted successfully',
                userId: userId,
                email: email,
                deleted: true
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
