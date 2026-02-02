import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service key for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Resolve anchor UUID from anchor_id string, or fall back to user's default anchor
async function resolveAnchorUuid(userId, anchorId) {
  if (anchorId) {
    try {
      const { data: anchor } = await supabase
        .from('memory_anchors')
        .select('id')
        .eq('anchor_id', anchorId)
        .eq('user_id', userId)
        .single();
      if (anchor?.id) return anchor.id;
    } catch (err) {
      console.warn('Failed to resolve anchor by anchorId:', err);
    }
  }

  // Fall back to user's default anchor
  try {
    const { data: defaultAnchor } = await supabase
      .from('memory_anchors')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();
    return defaultAnchor?.id || null;
  } catch (err) {
    console.warn('Failed to resolve default anchor:', err);
    return null;
  }
}

// Extract learnings from a conversation and store them
export async function extractAndStoreMemory(userId, chatId, messages, feedback = {}, anchorId = null) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Format messages for analysis
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    // Use a fast model to extract insights
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a memory extraction system. Analyze this conversation and extract key learnings about the user.

Output valid JSON with these arrays (each item is a short statement):
{
  "preferences": ["what user prefers or likes"],
  "facts": ["factual info about the user"],
  "style": ["how user likes to communicate"],
  "successful": ["what worked well in responses"],
  "mistakes": ["what the user didn't like or what went wrong"]
}

Be concise. Each item should be 5-15 words. Only include confident insights.
If nothing notable, return empty arrays.`
        },
        {
          role: 'user',
          content: `Conversation:\n${conversationText}\n\nFeedback: ${JSON.stringify(feedback)}`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500
    });

    const insights = JSON.parse(response.choices[0].message.content);

    // Resolve anchor UUID for linking memories
    const anchorUuid = await resolveAnchorUuid(userId, anchorId);

    // Store each memory, avoiding duplicates
    const memoriesToStore = [];

    const addMemory = (type, content, importance = 1.0, source = 'conversation') => {
      if (content && content.trim()) {
        memoriesToStore.push({
          user_id: userId,
          anchor_id: anchorUuid,
          memory_type: type,
          content: content.trim(),
          importance,
          memory_source: 'implicit',
          source_chat_id: chatId,
          learned_from: source
        });
      }
    };

    // Process each type of insight
    (insights.preferences || []).forEach(p => addMemory('preference', p, 1.0));
    (insights.facts || []).forEach(f => addMemory('fact', f, 1.2));
    (insights.style || []).forEach(s => addMemory('style', s, 1.0));
    (insights.successful || []).forEach(s => addMemory('success', s, 1.5, 'thumbs_up'));
    (insights.mistakes || []).forEach(m => addMemory('mistake', m, 2.0, 'thumbs_down')); // Mistakes are high priority

    // Store memories, merging with existing ones
    for (const memory of memoriesToStore) {
      // Check for similar existing memory
      const { data: existing } = await supabase
        .from('user_memory')
        .select('id, times_reinforced, importance')
        .eq('user_id', userId)
        .eq('memory_type', memory.memory_type)
        .ilike('content', `%${memory.content.slice(0, 30)}%`)
        .limit(1)
        .single();

      if (existing) {
        // Reinforce existing memory
        await supabase
          .from('user_memory')
          .update({
            times_reinforced: existing.times_reinforced + 1,
            importance: Math.min(existing.importance * 1.1, 5.0), // Cap at 5
            last_used_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Insert new memory
        await supabase.from('user_memory').insert(memory);
      }
    }

    return { success: true, memoriesStored: memoriesToStore.length };
  } catch (error) {
    console.error('Memory extraction error:', error);
    return { success: false, error: error.message };
  }
}

// Get user's memories for injection into chat
export async function getUserMemories(userId, plan) {
  // All plans now get memory access
  const { data: memories, error } = await supabase
    .from('user_memory')
    .select('memory_type, content, importance')
    .eq('user_id', userId)
    .order('importance', { ascending: false })
    .limit(25);

  if (error) {
    console.error('Error fetching memories:', error);
    return [];
  }

  return memories || [];
}

// Build memory context string for AI
export function buildMemoryContext(memories) {
  if (!memories || memories.length === 0) return '';

  const mistakes = memories.filter(m => m.memory_type === 'mistake');
  const preferences = memories.filter(m => m.memory_type === 'preference');
  const facts = memories.filter(m => m.memory_type === 'fact');
  const style = memories.filter(m => m.memory_type === 'style');
  const successes = memories.filter(m => m.memory_type === 'success');

  let context = '\n\n[PERSONALIZATION - Apply these learnings to improve responses]\n';

  if (mistakes.length > 0) {
    context += '\nAVOID (learned from past feedback):\n';
    mistakes.forEach(m => context += `- ${m.content}\n`);
  }

  if (preferences.length > 0) {
    context += '\nUser preferences:\n';
    preferences.forEach(m => context += `- ${m.content}\n`);
  }

  if (facts.length > 0) {
    context += '\nKnown about this user:\n';
    facts.forEach(m => context += `- ${m.content}\n`);
  }

  if (style.length > 0) {
    context += '\nCommunication style:\n';
    style.forEach(m => context += `- ${m.content}\n`);
  }

  if (successes.length > 0) {
    context += '\nWhat works well:\n';
    successes.forEach(m => context += `- ${m.content}\n`);
  }

  return context;
}

// API endpoint for memory extraction
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, chatId, messages, feedback, anchorId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await extractAndStoreMemory(userId, chatId, messages || [], feedback || {}, anchorId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Extract memory API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
