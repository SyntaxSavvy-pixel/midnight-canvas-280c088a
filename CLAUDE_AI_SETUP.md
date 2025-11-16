# Claude AI Chat Setup Guide

## Overview
Your popup extension now has Claude AI chat functionality! Users can ask questions and get intelligent responses.

## Step 1: Get Claude API Key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

## Step 2: Deploy Cloudflare Worker

1. Go to your Cloudflare Dashboard: https://dash.cloudflare.com
2. Click **Workers & Pages** in the left sidebar
3. Click **Create Application** → **Create Worker**
4. Name it: `claude-chat-api`
5. Click **Deploy**
6. Click **Edit Code**
7. Copy the code from `cloudflare-workers/claude-chat-api.js`
8. Paste it into the worker editor
9. Click **Save and Deploy**

## Step 3: Add API Key to Worker

1. In the worker page, click **Settings**
2. Scroll to **Environment Variables**
3. Click **Add variable**
4. Name: `ANTHROPIC_API_KEY`
5. Value: Paste your Claude API key
6. Type: **Secret** (encrypt it)
7. Click **Save**

## Step 4: Set Up Route

1. In your Cloudflare Dashboard, go to your domain (tabmangment.com)
2. Go to **Workers Routes**
3. Click **Add route**
4. Route: `tabmangment.com/api/claude-chat`
5. Worker: Select `claude-chat-api`
6. Click **Save**

## Step 5: Test It!

1. Load your extension
2. Click the **Chat** button in the popup
3. Type a message and press Enter
4. You should see Claude AI respond!

## Features

- **Conversation History**: Claude remembers the last 20 messages
- **Context Aware**: Knows it's helping with Tabmangment extension
- **Short Responses**: Configured to give concise, helpful answers
- **Error Handling**: Shows friendly error messages if something goes wrong

## Cost Estimation

Claude API pricing (as of 2024):
- Claude 3.5 Sonnet: $3 per million input tokens, $15 per million output tokens
- Average chat message: ~100-500 tokens
- Estimated cost: $0.001 - $0.005 per message

For 1000 users with 10 messages each = 10,000 messages:
- Estimated cost: $10 - $50/month

## Optional: Add Usage Limits

To prevent abuse, you can add rate limiting in the Cloudflare Worker:

```javascript
// Add this at the top of handleRequest()
const userEmail = body.userEmail || 'anonymous';

// Check rate limit (example using KV storage)
const rateLimitKey = `rate_limit:${userEmail}`;
const currentCount = await env.KV.get(rateLimitKey);

if (currentCount && parseInt(currentCount) > 100) {
    return new Response(JSON.stringify({
        error: 'Rate limit exceeded'
    }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Increment counter
await env.KV.put(rateLimitKey, (parseInt(currentCount || 0) + 1).toString(), {
    expirationTtl: 86400 // 24 hours
});
```

## Troubleshooting

**Chat not working?**
- Check Cloudflare Worker logs
- Verify API key is correct
- Make sure route is set up correctly
- Check browser console for errors (F12)

**API Key Invalid?**
- Make sure it starts with `sk-ant-`
- Regenerate key if needed
- Verify it's saved as a Secret in Worker environment variables

**CORS Errors?**
- Worker should have CORS headers (already included in code)
- Check that route matches exactly: `tabmangment.com/api/claude-chat`

## Next Steps

Consider adding:
- Message history persistence (save to Supabase)
- Premium users get more messages
- Context about user's open tabs
- Quick actions like "close duplicate tabs"
