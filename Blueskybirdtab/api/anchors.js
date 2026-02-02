import { createClient } from '@supabase/supabase-js';

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

const getSupabase = () => {
  // Try both SUPABASE_URL and VITE_SUPABASE_URL for compatibility
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
};

// =============================================================================
// PLAN LIMITS FOR ANCHORS
// =============================================================================

const ANCHOR_LIMITS = {
  free: 1,
  pro: 5,
  max: Infinity
};

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // For GET/DELETE, userId comes from query params; for POST/PATCH, from body
    let userId;
    if (req.method === 'GET' || req.method === 'DELETE') {
      userId = req.query?.userId;
    } else {
      userId = req.body?.userId;
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // GET - List user's anchors
    if (req.method === 'GET') {
      const { data: anchors, error } = await supabase
        .from('memory_anchors')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('last_used_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({ anchors: anchors || [] });
    }

    // POST - Create new anchor
    if (req.method === 'POST') {
      const { name, purpose } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'name is required' });
      }

      // Check user's plan and anchor count
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .single();

      const plan = profile?.plan || 'free';
      const limit = ANCHOR_LIMITS[plan] || ANCHOR_LIMITS.free;

      // Count existing anchors
      const { count } = await supabase
        .from('memory_anchors')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (count >= limit) {
        return res.status(403).json({
          error: 'anchor_limit_reached',
          message: `You've reached your limit of ${limit} memory anchor${limit === 1 ? '' : 's'}. Upgrade to create more.`,
          limit,
          current: count,
          plan
        });
      }

      // Generate anchor_id using the database function
      const purposeCode = purpose || 'GEN';
      const { data: generatedId, error: genError } = await supabase
        .rpc('generate_anchor_id', { p_user_id: userId, p_purpose: purposeCode });

      if (genError) throw genError;

      // Create the anchor
      const { data: anchor, error: insertError } = await supabase
        .from('memory_anchors')
        .insert({
          user_id: userId,
          anchor_id: generatedId,
          name: name.trim(),
          purpose: purpose || null,
          is_default: false
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return res.status(201).json({ anchor });
    }

    // PATCH - Update anchor
    if (req.method === 'PATCH') {
      const { anchorId, name, purpose, isDefault } = req.body;

      if (!anchorId) {
        return res.status(400).json({ error: 'anchorId is required' });
      }

      const updates = {};
      if (name !== undefined) updates.name = name.trim();
      if (purpose !== undefined) updates.purpose = purpose;

      // Handle setting as default
      if (isDefault === true) {
        // First, unset any existing default
        await supabase
          .from('memory_anchors')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('is_default', true);

        updates.is_default = true;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      const { data: anchor, error } = await supabase
        .from('memory_anchors')
        .update(updates)
        .eq('anchor_id', anchorId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({ anchor });
    }

    // DELETE - Delete anchor
    if (req.method === 'DELETE') {
      const anchorId = req.query?.anchorId || req.body?.anchorId;

      if (!anchorId) {
        return res.status(400).json({ error: 'anchorId is required' });
      }

      // Check if this is the default anchor
      const { data: anchor } = await supabase
        .from('memory_anchors')
        .select('is_default')
        .eq('anchor_id', anchorId)
        .eq('user_id', userId)
        .single();

      if (anchor?.is_default) {
        return res.status(400).json({
          error: 'cannot_delete_default',
          message: 'Cannot delete the default memory anchor. Set another anchor as default first.'
        });
      }

      // Delete the anchor (memories will cascade delete)
      const { error } = await supabase
        .from('memory_anchors')
        .delete()
        .eq('anchor_id', anchorId)
        .eq('user_id', userId);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Anchors API error:', error);
    return res.status(500).json({
      error: error.message || 'An unexpected error occurred'
    });
  }
}
