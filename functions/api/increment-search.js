// ================================================
// STEP 3B: Increment Search API Endpoint
// ================================================
// File location: /functions/api/increment-search.js
// Endpoint: POST https://tabmangment.com/api/increment-search

import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Parse request body
    const body = await request.json();
    const { email } = body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if user is Pro/Premium (skip limit for Pro users)
    const { data: user } = await supabase
      .from('users')
      .select('isPro, isPremium')
      .eq('email', email)
      .single();

    // If Pro, still log the search but don't enforce limit
    const isPro = user && (user.isPro || user.isPremium);

    // Insert new search record
    const { error: insertError } = await supabase
      .from('search_usage')
      .insert([{
        user_email: email,
        searched_at: new Date().toISOString()
      }]);

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to record search'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get updated search count (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { data: searches, error: countError } = await supabase
      .from('search_usage')
      .select('id')
      .eq('user_email', email)
      .gte('searched_at', twentyFourHoursAgo.toISOString());

    if (countError) {
      console.error('Supabase count error:', countError);
      // Still return success since insert worked
      return new Response(JSON.stringify({
        success: true,
        message: 'Search recorded',
        searchCount: 1,
        remaining: isPro ? 999 : 4
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Calculate counts
    const searchCount = searches?.length || 0;
    const remaining = isPro ? 999 : Math.max(0, 5 - searchCount);
    const limitReached = !isPro && searchCount >= 5;

    // Return response
    return new Response(JSON.stringify({
      success: true,
      message: 'Search recorded successfully',
      searchCount,
      remaining,
      limitReached,
      isPro
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
