// ================================================
// STEP 3A: Check Search Usage API Endpoint
// ================================================
// File location: /functions/api/check-search-usage.js
// Endpoint: POST https://tabmangment.com/api/check-search-usage

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

    // Check if user is Pro/Premium (unlimited searches)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('isPro, isPremium')
      .eq('email', email)
      .single();

    // If user is Pro, return unlimited
    if (user && (user.isPro || user.isPremium)) {
      return new Response(JSON.stringify({
        success: true,
        searchCount: 0,
        canSearch: true,
        isPro: true
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Allow extension to call
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // Calculate 24 hours ago timestamp
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Query search_usage table for searches in last 24 hours
    const { data: searches, error: searchError } = await supabase
      .from('search_usage')
      .select('id, searched_at')
      .eq('user_email', email)
      .gte('searched_at', twentyFourHoursAgo.toISOString())
      .order('searched_at', { ascending: false });

    if (searchError) {
      console.error('Supabase query error:', searchError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Database error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculate search count and eligibility
    const searchCount = searches?.length || 0;
    const canSearch = searchCount < 5;
    const remaining = Math.max(0, 5 - searchCount);

    // Calculate when limit resets (earliest search + 24h)
    let resetsAt = null;
    if (searches && searches.length > 0) {
      const oldestSearch = searches[searches.length - 1];
      const resetTime = new Date(oldestSearch.searched_at);
      resetTime.setHours(resetTime.getHours() + 24);
      resetsAt = resetTime.toISOString();
    }

    // Return response
    return new Response(JSON.stringify({
      success: true,
      searchCount,
      canSearch,
      remaining,
      resetsAt,
      isPro: false
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate' // Don't cache
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
