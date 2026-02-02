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
    // Get anchorId from URL path
    const { anchorId } = req.query;
    const { userId } = req.body || req.query || {};

    if (!anchorId) {
      return res.status(400).json({ error: 'anchorId is required' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify anchor belongs to user and get anchor UUID
    const { data: anchor, error: anchorError } = await supabase
      .from('memory_anchors')
      .select('id, anchor_id')
      .eq('anchor_id', anchorId)
      .eq('user_id', userId)
      .single();

    if (anchorError || !anchor) {
      return res.status(404).json({ error: 'Anchor not found' });
    }

    const anchorUuid = anchor.id;

    // GET - List memories for this anchor
    if (req.method === 'GET') {
      const { data: memories, error } = await supabase
        .from('user_memory')
        .select('id, memory_type, content, memory_source, importance, created_at, updated_at')
        .eq('anchor_id', anchorUuid)
        .order('importance', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({ memories: memories || [] });
    }

    // POST - Add new explicit memory
    if (req.method === 'POST') {
      const { content, memoryType = 'fact' } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'content is required' });
      }

      const { data: memory, error } = await supabase
        .from('user_memory')
        .insert({
          user_id: userId,
          anchor_id: anchorUuid,
          memory_type: memoryType,
          memory_source: 'explicit',
          content: content.trim(),
          importance: 1.5, // Explicit memories get higher importance
          learned_from: 'explicit'
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ memory });
    }

    // PATCH - Update memory
    if (req.method === 'PATCH') {
      const { memoryId, content, memoryType } = req.body;

      if (!memoryId) {
        return res.status(400).json({ error: 'memoryId is required' });
      }

      const updates = {};
      if (content !== undefined) updates.content = content.trim();
      if (memoryType !== undefined) updates.memory_type = memoryType;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      const { data: memory, error } = await supabase
        .from('user_memory')
        .update(updates)
        .eq('id', memoryId)
        .eq('anchor_id', anchorUuid)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({ memory });
    }

    // DELETE - Delete memory
    if (req.method === 'DELETE') {
      const { memoryId } = req.body || req.query;

      if (!memoryId) {
        return res.status(400).json({ error: 'memoryId is required' });
      }

      const { error } = await supabase
        .from('user_memory')
        .delete()
        .eq('id', memoryId)
        .eq('anchor_id', anchorUuid);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Anchor memories API error:', error);
    return res.status(500).json({
      error: error.message || 'An unexpected error occurred'
    });
  }
}
