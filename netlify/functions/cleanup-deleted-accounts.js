// Netlify Function to permanently delete accounts after 24 hours
// Can be triggered manually via: POST /api/cleanup-deleted-accounts
// Or set up with an external cron service (e.g., cron-job.org) to call it hourly

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://voislxlhfepnllamagxm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event, context) => {
    const headers = {
        'Content-Type': 'application/json'
    };

    try {
        console.log('🧹 Starting cleanup of accounts marked for deletion...');

        if (!supabaseServiceKey) {
            console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Server configuration error'
                })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Get all users
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error('❌ Error listing users:', listError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to list users',
                    details: listError.message
                })
            };
        }

        console.log(`📋 Found ${users.length} total users`);

        const now = new Date();
        let deletedCount = 0;
        const deletedUsers = [];

        // Check each user for expired deletion schedule
        for (const user of users) {
            const deletionScheduledAt = user.user_metadata?.deletion_scheduled_at;

            if (deletionScheduledAt) {
                const deletionTime = new Date(deletionScheduledAt);

                console.log(`⏰ User ${user.email} scheduled for deletion at:`, deletionTime);
                console.log(`🕐 Current time:`, now);

                // If deletion time has passed, delete the user
                if (now >= deletionTime) {
                    console.log(`🗑️ Deleting user ${user.email} (${user.id})...`);

                    try {
                        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

                        if (deleteError) {
                            console.error(`❌ Failed to delete user ${user.email}:`, deleteError);
                        } else {
                            console.log(`✅ Successfully deleted user ${user.email}`);
                            deletedCount++;
                            deletedUsers.push({
                                email: user.email,
                                id: user.id,
                                scheduledAt: deletionScheduledAt
                            });

                            // Also delete from users table if exists
                            try {
                                await supabase
                                    .from('users')
                                    .delete()
                                    .eq('email', user.email);
                                console.log(`✅ Deleted ${user.email} from users table`);
                            } catch (tableErr) {
                                console.log(`⚠️ Could not delete from users table:`, tableErr);
                            }
                        }
                    } catch (err) {
                        console.error(`❌ Error deleting user ${user.email}:`, err);
                    }
                } else {
                    const hoursRemaining = Math.ceil((deletionTime - now) / (1000 * 60 * 60));
                    console.log(`⏳ User ${user.email} will be deleted in ${hoursRemaining} hours`);
                }
            }
        }

        console.log(`✅ Cleanup complete. Deleted ${deletedCount} accounts`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Cleanup complete. Deleted ${deletedCount} accounts`,
                deletedCount,
                deletedUsers
            })
        };

    } catch (error) {
        console.error('❌ CRITICAL ERROR in cleanup function:', error);
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
