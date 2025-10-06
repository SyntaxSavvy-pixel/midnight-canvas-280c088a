// API endpoint to delete user account
// POST /api/delete-account
// Body: { userId, email }

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://voislxlhfepnllamagxm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId, email } = req.body;

        console.log('🗑️ DELETE ACCOUNT REQUEST - userId:', userId, 'email:', email);

        if (!userId || !email) {
            console.error('❌ Missing required fields');
            return res.status(400).json({
                success: false,
                error: 'userId and email are required'
            });
        }

        // Initialize Supabase admin client with service role key
        if (!supabaseServiceKey) {
            console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured in environment');
            return res.status(500).json({
                success: false,
                error: 'Server configuration error - missing service key'
            });
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
            return res.status(500).json({
                success: false,
                error: 'Failed to delete user account',
                details: deleteError.message,
                code: deleteError.code
            });
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

        return res.status(200).json({
            success: true,
            message: 'Account deleted successfully',
            userId: userId,
            email: email,
            deleted: true
        });

    } catch (error) {
        console.error('❌ CRITICAL ERROR in delete-account handler:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
