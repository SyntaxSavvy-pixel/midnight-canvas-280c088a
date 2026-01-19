# Quick Start Guide - TabKeep with Perplexica

## 🚀 Get Started in 3 Steps

### Step 1: Get Your API Keys (5 minutes)

#### OpenAI API Key
1. Visit https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

#### Brave Search API Key (FREE!)
1. Visit https://api.search.brave.com/register
2. Sign up (no credit card required)
3. Get 2,000 free searches per month
4. Copy your API key (starts with `BSA`)

### Step 2: Configure Environment (1 minute)

Open `Perplexica/.env.local` and update:

```bash
OPENAI_API_KEY=sk-paste-your-actual-key-here
BRAVE_API_KEY=BSA-paste-your-actual-key-here
```

### Step 3: Launch (1 minute)

```bash
npm run dev
```

Wait for the servers to start, then open:
- **http://localhost:3000** (or http://localhost:8080)

## 🎯 First-Time Setup

When you first open the app:

1. **Setup Wizard appears**
2. Configure OpenAI:
   - Provider: OpenAI ✓
   - API Key: (auto-filled from .env.local) ✓
   - Base URL: https://api.openai.com/v1 ✓
3. Select Models:
   - Chat: `gpt-4o-mini` (recommended, faster & cheaper)
   - Embedding: `text-embedding-3-small` ✓
4. Configure Search:
   - Engine: Brave Search ✓
   - API Key: (auto-filled from .env.local) ✓
5. Click **"Complete Setup"**

## 💬 Start Chatting

Try these queries:

- "What's the latest news about AI?"
- "Compare Python vs JavaScript for beginners"
- "What's the weather in San Francisco?"
- "Explain quantum computing"

## 🎨 Customize

### Settings → Preferences
- Theme: Dark/Light
- Auto media search: On/Off
- Weather widget: On/Off
- News widget: On/Off

### Settings → Personalization
- Add custom system instructions
- Example: "Always respond in a friendly, concise tone"

### Settings → Providers
- Add more AI providers (Anthropic, Gemini, Groq, etc.)
- Switch between providers easily

## 💡 Pro Tips

1. **Use Search Modes**:
   - Speed: Quick answers
   - Balanced: Comprehensive (default)
   - Quality: Deep research

2. **View Sources**: Click on citations to see where info came from

3. **Chat History**: Access past conversations in the sidebar

4. **Keyboard Shortcuts**:
   - `Ctrl + K`: Focus search/chat input
   - `Esc`: Close dialogs

5. **Save Costs**: Use `gpt-4o-mini` instead of `gpt-4o` for 10x cheaper responses

## 🔧 Troubleshooting

### "Failed to connect to server"
```bash
# Kill existing processes
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Restart
npm run dev
```

### "OpenAI API error"
- Check your API key in `.env.local`
- Verify you have credits at https://platform.openai.com/account/billing

### "Brave Search error"
- Check your API key in `.env.local`
- Verify limit at https://api.search.brave.com/dashboard

### Setup wizard won't go away
- Ensure both API keys are valid in `.env.local`
- Restart the app
- Check `Perplexica/data/config.json` was created

## 📚 Learn More

- Full Setup Guide: `PERPLEXICA_SETUP.md`
- Migration Details: `MIGRATION_SUMMARY.md`
- Perplexica Docs: https://github.com/ItzCrazyKns/Perplexica

## 🎉 That's It!

You're ready to go. Enjoy your clean, AI-powered search experience!

---

**Need help?** Check the troubleshooting section above or the full setup guide.
