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


        const now = new Date();
        let deletedCount = 0;
        const deletedUsers = [];

        // Check each user for expired deletion schedule
        for (const user of users) {
            const deletionScheduledAt = user.user_metadata?.deletion_scheduled_at;

            if (deletionScheduledAt) {
                const deletionTime = new Date(deletionScheduledAt);


                // If deletion time has passed, delete the user
                if (now >= deletionTime) {

                    try {
                        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

                        if (deleteError) {
                            console.error(`❌ Failed to delete user:`, deleteError);
                        } else {
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
                            } catch (tableErr) {
                            }
                        }
                    } catch (err) {
                        console.error(`❌ Error deleting user:`, err);
                    }
                } else {
                    const hoursRemaining = Math.ceil((deletionTime - now) / (1000 * 60 * 60));
                }
            }
        }


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
