#!/usr/bin/env node

/**
 * Run RLS Policy Migration for users_auth table
 *
 * This script updates the Row Level Security policies on the users_auth table
 * to allow authenticated users to read, insert, and update their own records.
 *
 * This fixes the 403 Forbidden errors when users try to access the users_auth table.
 */

const fs = require('fs');
const path = require('path');

// Read Supabase credentials from environment or prompt
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://voislxlhfepnllamagxm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.error('Please set it with: export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    process.exit(1);
}

async function runMigration() {
    console.log('🚀 Starting RLS policy migration for users_auth table...\n');

    try {
        // Read the SQL file
        const sqlFile = path.join(__dirname, 'fix-users-auth-rls.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('📄 SQL Migration:');
        console.log('─'.repeat(60));
        console.log(sql);
        console.log('─'.repeat(60));
        console.log();

        // Execute the SQL using Supabase REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ query: sql })
        });

        // If the rpc endpoint doesn't exist, try direct SQL execution
        if (response.status === 404) {
            console.log('⚠️  RPC endpoint not available, using alternative method...\n');

            // Alternative: Use the SQL editor endpoint
            const altResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ query: sql })
            });

            if (!altResponse.ok) {
                throw new Error(`Migration failed: ${altResponse.status} ${altResponse.statusText}`);
            }
        } else if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Migration failed: ${response.status} ${response.statusText}\n${errorText}`);
        }

        console.log('✅ Migration completed successfully!\n');
        console.log('The following policies have been created on users_auth table:');
        console.log('  1. Users can view their own auth record (SELECT)');
        console.log('  2. Users can insert their own auth record (INSERT)');
        console.log('  3. Users can update their own auth record (UPDATE)');
        console.log();
        console.log('🎉 The 403 Forbidden errors should now be resolved!');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nPlease run this SQL manually in your Supabase SQL Editor:');
        console.error('https://supabase.com/dashboard/project/voislxlhfepnllamagxm/sql');
        console.error('\nCopy and paste the contents of fix-users-auth-rls.sql');
        process.exit(1);
    }
}

console.log('═'.repeat(60));
console.log('  RLS POLICY MIGRATION FOR users_auth TABLE');
console.log('═'.repeat(60));
console.log();

runMigration();
