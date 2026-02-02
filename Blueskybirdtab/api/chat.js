import { createClient } from '@supabase/supabase-js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_MESSAGE_LENGTH = 10000;
const MAX_HISTORY_FOR_CHAT = 20;
const MAX_HISTORY_FOR_SEARCH = 0;

// Thinking budget for extended thinking
const THINKING_BUDGET = 10000;

// Model configuration
const MODELS = {
  // Claude - better for complex coding, analysis, and technical tasks
  claude: {
    thinking: 'claude-sonnet-4-5-20250929',
    standard: 'claude-sonnet-4-20250514'
  },
  // OpenAI - GPT-5 for real-time queries
  openai: {
    default: 'gpt-5-2025-08-07',
    mini: 'gpt-4o-mini'
  }
};

// Plan configurations
const PLANS = {
  free: { intelligenceLimit: 100, crossChatMemory: true, realTimeLearning: true, memoryLimit: 15 },
  pro: { intelligenceLimit: 500, cooldownHours: 3, crossChatMemory: true, realTimeLearning: true, memoryLimit: 25 },
  max: { intelligenceLimit: Infinity, crossChatMemory: true, realTimeLearning: true, memoryLimit: 50 }
};

// =============================================================================
// SYSTEM PROMPT - Enhanced for better understanding
// =============================================================================

function buildSystemPrompt(currentDate, mode, memoryContext = '') {
  const basePrompt = `You are TabKeep, a highly intelligent AI assistant with deep reasoning capabilities.

TODAY'S DATE: ${currentDate}

CRITICAL: UNDERSTAND USER INTENT
Before responding, deeply analyze what the user ACTUALLY wants:
- "copy time.is" = User wants you to CREATE/CODE a clone of that website, not explain what it does
- "make X like Y" = User wants you to BUILD something similar to Y
- "clone/copy/replicate [website]" = User wants CODE to recreate that site's functionality
- If a user mentions a website/app, they likely want you to BUILD something similar

RESPONSE APPROACH:
1. First, internally reason about what the user truly wants
2. If they're asking about a website/app, assume they want you to CREATE something similar unless they explicitly say otherwise
3. When building/coding, provide complete, working code
4. Be concise but thorough when coding

CODING GUIDELINES (when building):
- Provide complete, runnable code
- Use modern best practices
- Include necessary HTML, CSS, and JavaScript
- Make it functional and visually similar to the reference

GENERAL RULES:
- Be direct and helpful
- Don't over-explain unless asked
- If uncertain about intent, lean toward the more useful interpretation
- Today's date is ${currentDate} - use this for any time-related queries`;

  const modeInstructions = {
    search: `

MODE: SEARCH/BUILD
Treat this as a fresh request. If the user mentions a website or app, they likely want you to BUILD something similar.`,

    chat: `

MODE: CONVERSATION
Continue the conversation naturally. Reference previous context when relevant.`,

    deep: `

MODE: DEEP ANALYSIS
Provide detailed, comprehensive responses with thorough explanations.`
  };

  let prompt = basePrompt + (modeInstructions[mode] || modeInstructions.search);

  if (memoryContext && memoryContext.trim()) {
    prompt += `

USER CONTEXT (apply silently - never mention you have stored memories):
${memoryContext}

IMPORTANT: Use this context naturally. Address the user by name when appropriate. Adapt your communication style based on their preferences. Reference known facts when relevant. Never reveal that you're reading from stored memories.`;
  }

  return prompt;
}

// =============================================================================
// SIMPLE QUERY DETECTION
// =============================================================================

function isSimpleDateQuery(message) {
  const msg = message.toLowerCase().trim();
  const simpleDatePatterns = [
    /^what('s|s| is) today\??$/i,
    /^what('s|s| is) the date\??$/i,
    /^what day is it\??$/i,
    /^today('s|s)? date\??$/i,
    /^date\??$/i,
    /^current date\??$/i
  ];
  return simpleDatePatterns.some(p => p.test(msg));
}

function getSimpleDateResponse() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  };
  return `Today is ${now.toLocaleDateString('en-US', options)}.`;
}

// =============================================================================
// MODEL SELECTION - Smart routing between Claude and GPT-5
// =============================================================================

function selectModel(message, intent) {
  const msg = message.toLowerCase();

  // Patterns that indicate need for real-time/current information
  const realTimePatterns = [
    // Current events & news
    /\b(latest|current|recent|today'?s?|this week|this month|this year|2024|2025|2026)\b/i,
    /\b(news|trending|happening|ongoing)\b/i,
    // Real-time data queries
    /\b(price|stock|weather|score|result|standings|ranking)\b/i,
    /\b(highest paid|richest|top \d+|best selling|most popular)\b.*\b(right now|currently|today|this year|2024|2025|2026)\b/i,
    // Explicit current info requests
    /\b(who is|what is|find|search|look up)\b.*\b(now|currently|latest|recent)\b/i,
    /\bwho (are|is) the (highest|best|top|most|richest)\b/i,
    // Sports, entertainment current
    /\b(box office|chart|billboard|grammy|oscar|emmy|award)\b.*\b(winner|nominee|2024|2025|2026)\b/i,
  ];

  // Check if query needs real-time data
  const needsRealTime = realTimePatterns.some(pattern => pattern.test(msg));

  if (needsRealTime) {
    const matchedPattern = realTimePatterns.find(pattern => pattern.test(msg));
    console.log(`Query needs real-time data (matched: ${matchedPattern}), routing to GPT-5`);
    return 'openai';
  }

  // Default to Claude for everything else
  console.log('Query does not need real-time data, using Claude');
  return 'claude';
}

// =============================================================================
// INTENT DETECTION
// =============================================================================

function detectIntent(message, historyLength) {
  const msg = message.toLowerCase().trim();

  // Deep analysis patterns
  const deepPatterns = [
    /explain in detail/i,
    /comprehensive/i,
    /thorough analysis/i,
    /tell me everything/i,
    /deep dive/i
  ];

  if (deepPatterns.some(p => p.test(msg))) {
    return { mode: 'deep', isSearch: false, useHistory: true };
  }

  // Build/code patterns - prioritize these
  const buildPatterns = [
    /^(copy|clone|replicate|recreate|build|make|create)/i,
    /like\s+\w+\.(com|io|app|net|org)/i,
    /\.(com|io|app|net|org)/i
  ];

  if (buildPatterns.some(p => p.test(msg))) {
    return { mode: 'search', isSearch: true, useHistory: false };
  }

  // Conversation patterns
  const chatPatterns = [
    /^(yes|no|yeah|nope|ok|okay|sure)/i,
    /^(and|but|also|what about)/i,
    /^(can you|could you|please)/i,
    /^(more|another|different)/i,
    /you (said|mentioned|told)/i,
    /earlier/i,
    /^that/i
  ];

  const isConversation = chatPatterns.some(p => p.test(msg)) && historyLength > 0;

  if (historyLength === 0) {
    return { mode: 'search', isSearch: true, useHistory: false };
  }

  if (isConversation) {
    return { mode: 'chat', isSearch: false, useHistory: true };
  }

  return { mode: 'chat', isSearch: false, useHistory: true };
}

// =============================================================================
// DATE UTILITIES
// =============================================================================

function getCurrentDateString() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  };
  return now.toLocaleDateString('en-US', options);
}

// =============================================================================
// SUPABASE HELPERS
// =============================================================================

const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
};

// =============================================================================
// INTELLIGENCE & LIMITS
// =============================================================================

function calculateIntelligenceCost(message, responseLength, hadThinking = false) {
  let cost = 1;
  const wordCount = message.split(/\s+/).length;
  cost += Math.floor(wordCount / 20);
  cost += Math.floor(responseLength / 500);
  if (hadThinking) cost += 2; // Extended thinking uses more resources
  return Math.max(1, Math.min(cost, 20));
}

async function checkUserLimits(supabase, userId) {
  if (!supabase || !userId) {
    return { canProceed: true, plan: 'free', skipTracking: true };
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan, intelligence_used, intelligence_limit, cooldown_until')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return { canProceed: true, plan: 'free', skipTracking: true };
    }

    const plan = profile.plan || 'free';
    const planConfig = PLANS[plan] || PLANS.free;
    const now = new Date();

    if (plan === 'max') {
      return { canProceed: true, plan: 'max', unlimited: true, crossChatMemory: true };
    }

    if (plan === 'pro' && profile.cooldown_until) {
      const cooldownEnd = new Date(profile.cooldown_until);
      if (now < cooldownEnd) {
        const minutesLeft = Math.ceil((cooldownEnd - now) / 60000);
        return {
          canProceed: false,
          error: 'limit_reached',
          message: minutesLeft > 60
            ? `Your thinking limit resets in ${Math.ceil(minutesLeft / 60)} hours`
            : `Your thinking limit resets in ${minutesLeft} minutes`,
          resetAt: cooldownEnd.toISOString(),
          plan: 'pro'
        };
      } else {
        await supabase
          .from('profiles')
          .update({ intelligence_used: 0, cooldown_until: null })
          .eq('id', userId);
        profile.intelligence_used = 0;
      }
    }

    const limit = profile.intelligence_limit || planConfig.intelligenceLimit;
    if (profile.intelligence_used >= limit) {
      if (plan === 'pro') {
        const cooldownEnd = new Date(now.getTime() + planConfig.cooldownHours * 60 * 60 * 1000);
        await supabase
          .from('profiles')
          .update({ cooldown_until: cooldownEnd.toISOString() })
          .eq('id', userId);

        return {
          canProceed: false,
          error: 'limit_reached',
          message: `Taking a breather. Resets in ${planConfig.cooldownHours} hours.`,
          resetAt: cooldownEnd.toISOString(),
          plan: 'pro'
        };
      } else {
        return {
          canProceed: false,
          error: 'limit_reached',
          message: "You've reached your free limit. Upgrade to continue.",
          showUpgrade: true,
          plan: 'free'
        };
      }
    }

    return {
      canProceed: true,
      plan,
      used: profile.intelligence_used,
      limit,
      crossChatMemory: planConfig.crossChatMemory
    };
  } catch (err) {
    console.error('Error checking limits:', err);
    return { canProceed: true, plan: 'free', skipTracking: true };
  }
}

async function updateUsage(supabase, userId, cost) {
  if (!supabase || !userId) return;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('intelligence_used')
      .eq('id', userId)
      .single();

    if (data) {
      await supabase
        .from('profiles')
        .update({ intelligence_used: (data.intelligence_used || 0) + cost })
        .eq('id', userId);
    }
  } catch (e) {
    console.error('Failed to update usage:', e);
  }
}

// =============================================================================
// MEMORY HANDLING (Pro/Max only)
// =============================================================================

async function getAnchorUuid(supabase, anchorId, userId) {
  if (!supabase || !anchorId) return null;

  try {
    const { data: anchor } = await supabase
      .from('memory_anchors')
      .select('id')
      .eq('anchor_id', anchorId)
      .eq('user_id', userId)
      .single();

    return anchor?.id || null;
  } catch (err) {
    console.error('Error fetching anchor:', err);
    return null;
  }
}

async function getOrCreateDefaultAnchor(supabase, userId) {
  if (!supabase || !userId) return null;

  try {
    const { data: existingAnchor } = await supabase
      .from('memory_anchors')
      .select('id, anchor_id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (existingAnchor) return existingAnchor;

    const { data: newAnchor, error } = await supabase
      .rpc('generate_anchor_id', { p_user_id: userId, p_purpose: 'DEF' })
      .single();

    if (error || !newAnchor) {
      console.error('Error generating anchor_id:', error);
      return null;
    }

    const { data: insertedAnchor, error: insertError } = await supabase
      .from('memory_anchors')
      .insert({
        user_id: userId,
        anchor_id: newAnchor,
        name: 'Default',
        is_default: true
      })
      .select('id, anchor_id')
      .single();

    if (insertError) {
      console.error('Error creating default anchor:', insertError);
      return null;
    }

    return insertedAnchor;
  } catch (err) {
    console.error('Error in getOrCreateDefaultAnchor:', err);
    return null;
  }
}

async function getUserMemories(supabase, anchorUuid, plan) {
  if (!supabase || !anchorUuid) return [];

  const planConfig = PLANS[plan] || PLANS.free;
  const memoryLimit = planConfig.memoryLimit || 15;

  try {
    const { data: memories } = await supabase
      .from('user_memory')
      .select('memory_type, content, importance, memory_source')
      .eq('anchor_id', anchorUuid)
      .order('importance', { ascending: false })
      .limit(memoryLimit);

    return memories || [];
  } catch (err) {
    console.error('Error fetching memories:', err);
    return [];
  }
}

function buildMemoryContext(memories, anchorId = null, userProfile = null) {
  let context = '';

  // Add user identity context
  if (userProfile) {
    context += 'User Profile:';
    if (userProfile.display_name) {
      context += `\n- Name: ${userProfile.display_name}`;
    }
    if (userProfile.email) {
      context += `\n- Email: ${userProfile.email}`;
    }
    context += '\n';
  }

  if (!memories || memories.length === 0) return context.trim();

  if (anchorId) {
    context += `\nMemory Anchor: ${anchorId}`;
  }
  context += '\nKnown User Context:';

  const explicit = memories.filter(m => m.memory_source === 'explicit');
  const implicit = memories.filter(m => m.memory_source === 'implicit' || !m.memory_source);

  if (explicit.length > 0) {
    context += '\n\nUser-provided facts:';
    explicit.forEach(m => context += `\n- ${m.content}`);
  }

  if (implicit.length > 0) {
    const preferences = implicit.filter(m => m.memory_type === 'preference');
    const facts = implicit.filter(m => m.memory_type === 'fact');
    const style = implicit.filter(m => m.memory_type === 'style');

    if (facts.length > 0) {
      context += '\n\nLearned facts:';
      facts.forEach(m => context += `\n- ${m.content}`);
    }

    if (preferences.length > 0) {
      context += '\n\nLearned preferences:';
      preferences.forEach(m => context += `\n- ${m.content}`);
    }

    if (style.length > 0) {
      context += '\n\nCommunication style:';
      style.forEach(m => context += `\n- ${m.content}`);
    }
  }

  return context.trim();
}

// =============================================================================
// OPENAI CLIENT & STREAMING
// =============================================================================

async function streamOpenAI(messages, systemPrompt, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  const modelId = MODELS.openai.default;

  console.log(`Streaming via OpenAI Responses API with web search: ${modelId}`);

  // Build input messages for Responses API
  const input = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Use OpenAI Responses API with web_search_preview tool
  // This gives GPT-5 the same web browsing ability as ChatGPT
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      instructions: systemPrompt,
      input,
      tools: [{ type: 'web_search_preview' }],
      stream: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI Responses API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      try {
        const data = JSON.parse(line.slice(6));

        // Responses API streams text via response.output_text.delta
        if (data.type === 'response.output_text.delta' && data.delta) {
          fullResponse += data.delta;
          res.write(`data: ${JSON.stringify({ type: 'content', content: data.delta })}\n\n`);
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  return fullResponse;
}

// =============================================================================
// MAIN HANDLER - Dual Model Support (Claude + OpenAI)
// =============================================================================

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const hasOpenAI = !!openaiKey;

  if (!anthropicKey && !hasOpenAI) {
    console.error('No API keys configured');
    return res.status(500).json({ error: 'API keys not configured' });
  }

  console.log(`API keys available - OpenAI: ${hasOpenAI}, Anthropic: ${!!anthropicKey}`);

  const supabase = getSupabase();

  try {
    const { message, history = [], userId, chatId, anchorId, images = [] } = req.body || {};

    // Validate
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` });
    }

    // Check limits
    const limitCheck = await checkUserLimits(supabase, userId);
    if (!limitCheck.canProceed) {
      return res.status(429).json({
        error: limitCheck.error,
        message: limitCheck.message,
        resetAt: limitCheck.resetAt,
        showUpgrade: limitCheck.showUpgrade
      });
    }

    // Fast path: Simple date queries
    if (isSimpleDateQuery(message)) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');

      const simpleResponse = getSimpleDateResponse();
      res.write(`data: ${JSON.stringify({ type: 'content', content: simpleResponse })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', intelligenceCost: 0, mode: 'simple' })}\n\n`);
      return res.end();
    }

    // Detect intent
    const sanitizedHistory = Array.isArray(history)
      ? history
          .filter(h => h && typeof h.role === 'string' && typeof h.content === 'string')
          .map(h => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: h.content.slice(0, MAX_MESSAGE_LENGTH),
          }))
      : [];

    const intent = detectIntent(message, sanitizedHistory.length);

    let contextHistory = [];
    if (intent.useHistory && sanitizedHistory.length > 0) {
      const maxHistory = intent.mode === 'deep' ? MAX_HISTORY_FOR_CHAT : Math.min(MAX_HISTORY_FOR_CHAT, 10);
      contextHistory = sanitizedHistory.slice(-maxHistory);
    }

    // Build memory context
    let memoryContext = '';
    let resolvedAnchorUuid = null;
    let resolvedAnchorId = anchorId;

    if (limitCheck.crossChatMemory && userId && supabase) {
      if (anchorId) {
        resolvedAnchorUuid = await getAnchorUuid(supabase, anchorId, userId);
      }

      if (!resolvedAnchorUuid) {
        const defaultAnchor = await getOrCreateDefaultAnchor(supabase, userId);
        if (defaultAnchor) {
          resolvedAnchorUuid = defaultAnchor.id;
          resolvedAnchorId = defaultAnchor.anchor_id;
        }
      }

      if (resolvedAnchorUuid) {
        const memories = await getUserMemories(supabase, resolvedAnchorUuid, limitCheck.plan);

        // Fetch user profile for context enrichment
        let userProfile = null;
        try {
          const { data } = await supabase
            .from('profiles')
            .select('display_name, email')
            .eq('id', userId)
            .single();
          userProfile = data;
        } catch (err) {
          console.warn('Failed to fetch profile for context:', err);
        }

        memoryContext = buildMemoryContext(memories, resolvedAnchorId, userProfile);
      }
    }

    // Build system prompt
    const currentDate = getCurrentDateString();
    const systemPrompt = buildSystemPrompt(currentDate, intent.mode, memoryContext);

    // Select which model to use
    const hasImages = Array.isArray(images) && images.length > 0;
    let selectedModel = selectModel(message, intent);

    // Force Claude for images (better multimodal support with extended thinking)
    if (hasImages) {
      selectedModel = 'claude';
    }

    // Fallback if selected model's API key is not available
    if (selectedModel === 'openai' && !hasOpenAI) {
      console.log('WARNING: OpenAI selected but API key not available, falling back to Claude');
      selectedModel = 'claude';
    }
    if (selectedModel === 'claude' && !anthropicKey) {
      console.log('WARNING: Claude selected but API key not available, falling back to OpenAI');
      selectedModel = 'openai';
    }

    console.log(`FINAL model: ${selectedModel} | OpenAI: ${hasOpenAI} | Claude: ${!!anthropicKey} | Query: "${message.slice(0, 50)}..."`);

    // Set up streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    let fullResponse = '';
    let hadThinking = false;

    // =========================================================================
    // CLAUDE PATH (Primary) - Falls back to GPT-5 if Claude fails
    // =========================================================================
    let claudeFailed = false;

    if (selectedModel === 'claude') {
      // Build messages for Claude
      const claudeMessages = [];

      // Add context history
      if (contextHistory.length > 0) {
        claudeMessages.push(...contextHistory);
      }

      // Handle images if present
      if (hasImages) {
        const content = [];

        // Add images first
        for (const imageData of images.slice(0, 4)) {
          let base64Data = imageData;
          let mediaType = 'image/jpeg';

          if (imageData.startsWith('data:')) {
            const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mediaType = match[1];
              base64Data = match[2];
            }
          }

          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data
            }
          });
        }

        // Add text
        content.push({
          type: 'text',
          text: message
        });

        claudeMessages.push({ role: 'user', content });
      } else {
        claudeMessages.push({ role: 'user', content: message });
      }

      // Try with extended thinking first, fallback to regular if it fails
      let claudeResponse;
      let useExtendedThinking = true;

      try {
        // First try with extended thinking
        claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'interleaved-thinking-2025-05-14'
          },
          body: JSON.stringify({
            model: MODELS.claude.thinking,
            max_tokens: 16000,
            thinking: {
              type: 'enabled',
              budget_tokens: THINKING_BUDGET
            },
            system: systemPrompt,
            messages: claudeMessages,
            stream: true
          })
        });

        if (!claudeResponse.ok) {
          const errorText = await claudeResponse.text();
          console.error('Extended thinking failed:', claudeResponse.status, errorText);
          throw new Error('Extended thinking failed');
        }
      } catch (thinkingError) {
        console.log('Falling back to regular Claude...');
        useExtendedThinking = false;

        try {
          // Fallback to regular Claude without extended thinking
          claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: MODELS.claude.standard,
              max_tokens: 8192,
              system: systemPrompt,
              messages: claudeMessages,
              stream: true
            })
          });

          if (!claudeResponse.ok) {
            const errorText = await claudeResponse.text();
            console.error('Claude API error:', claudeResponse.status, errorText);
            throw new Error(`Claude API error: ${claudeResponse.status}`);
          }
        } catch (claudeError) {
          console.error('Claude completely failed, will try GPT-5:', claudeError.message);
          claudeFailed = true;
        }
      }

      // Track if thinking was used and process streaming if Claude succeeded
      if (!claudeFailed) {
        hadThinking = useExtendedThinking;

        // Process the streaming response
        const reader = claudeResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            if (line === 'data: [DONE]') continue;

            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'content_block_start') {
                if (event.content_block?.type === 'thinking') {
                  hadThinking = true;
                }
              } else if (event.type === 'content_block_delta') {
                if (event.delta?.type === 'text_delta' && event.delta?.text) {
                  fullResponse += event.delta.text;
                  res.write(`data: ${JSON.stringify({ type: 'content', content: event.delta.text })}\n\n`);
                }
              } else if (event.type === 'error') {
                console.error('Stream error:', event.error);
                res.write(`data: ${JSON.stringify({ type: 'error', message: event.error?.message || 'Stream error' })}\n\n`);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    // =========================================================================
    // GPT-5 PATH - Direct selection for real-time queries OR fallback from Claude
    // =========================================================================
    let openAIFailed = false;

    if ((selectedModel === 'openai' || claudeFailed) && hasOpenAI) {
      if (claudeFailed) {
        console.log('Using GPT-5 as fallback after Claude failed...');
      } else {
        console.log('Using GPT-5 for real-time query...');
      }

      try {
        // Build OpenAI messages
        const openaiMessages = [];

        // Add context history
        if (contextHistory.length > 0) {
          openaiMessages.push(...contextHistory);
        }

        // Add current message
        openaiMessages.push({ role: 'user', content: message });

        // Use GPT-5
        fullResponse = await streamOpenAI(openaiMessages, systemPrompt, res);
        selectedModel = 'openai';

      } catch (openaiError) {
        console.error('GPT-5 failed:', openaiError.message);
        openAIFailed = true;
      }
    }

    // =========================================================================
    // FALLBACK TO CLAUDE - If GPT-5 was directly selected but failed
    // =========================================================================
    if (openAIFailed && anthropicKey && selectedModel === 'openai') {
      console.log('GPT-5 failed, falling back to Claude...');

      try {
        const claudeMessages = [];
        if (contextHistory.length > 0) {
          claudeMessages.push(...contextHistory);
        }
        claudeMessages.push({ role: 'user', content: message });

        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: MODELS.claude.standard,
            max_tokens: 8192,
            system: systemPrompt,
            messages: claudeMessages,
            stream: true
          })
        });

        if (claudeResponse.ok) {
          selectedModel = 'claude';
          const reader = claudeResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              if (line === 'data: [DONE]') continue;

              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === 'content_block_delta') {
                  if (event.delta?.type === 'text_delta' && event.delta?.text) {
                    fullResponse += event.delta.text;
                    res.write(`data: ${JSON.stringify({ type: 'content', content: event.delta.text })}\n\n`);
                  }
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        } else {
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI service temporarily unavailable. Please try again.' })}\n\n`);
        }
      } catch (fallbackError) {
        console.error('Claude fallback also failed:', fallbackError.message);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI service temporarily unavailable. Please try again.' })}\n\n`);
      }
    } else if ((claudeFailed || openAIFailed) && !fullResponse) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI service temporarily unavailable. Please try again.' })}\n\n`);
    }

    // Calculate cost and update usage
    const cost = calculateIntelligenceCost(message, fullResponse.length, hadThinking);

    if (!limitCheck.skipTracking && userId && supabase) {
      updateUsage(supabase, userId, cost).catch(console.error);
    }

    res.write(`data: ${JSON.stringify({
      type: 'done',
      intelligenceCost: cost,
      mode: intent.mode,
      hadThinking,
      model: selectedModel
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('Chat API error:', error.message || error);

    if (!res.headersSent) {
      return res.status(500).json({
        error: error.message || 'An unexpected error occurred',
        type: error.name || 'Unknown'
      });
    }

    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream error' })}\n\n`);
    res.end();
  }
}
