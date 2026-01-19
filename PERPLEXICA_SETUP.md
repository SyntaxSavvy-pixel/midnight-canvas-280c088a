# Perplexica Setup Guide

## Overview
Your TabKeep app now uses Perplexica's clean, modern UI for AI-powered chat with web search capabilities.

## What Changed
1. **UI**: Replaced midnight-canvas with Perplexica's clean interface
2. **Search Engine**: Added Brave Search API support (faster and cleaner than SearXNG)
3. **AI Provider**: OpenAI integration for high-quality chat responses

## Setup Instructions

### 1. Get OpenAI API Key

1. Visit https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy your API key
5. Open `Perplexica/.env.local`
6. Replace `your_openai_api_key_here` with your actual key

### 2. Get Brave Search API Key (FREE)

1. Visit https://api.search.brave.com/register
2. Sign up for a free account
3. Free tier includes **2,000 searches per month** - no credit card required
4. Copy your API key from the dashboard
5. Open `Perplexica/.env.local`
6. Replace `your_brave_api_key_here` with your actual key

### 3. Start the Application

```bash
npm run dev
```

This will:
- Start the API server on port 3001
- Start Perplexica UI on port 3000

### 4. First-Time Setup

When you first open the app at http://localhost:3000:

1. You'll see a setup wizard
2. Configure your OpenAI provider:
   - Provider: OpenAI
   - API Key: (should auto-fill from .env.local)
   - Base URL: https://api.openai.com/v1
3. Choose your default models:
   - Chat Model: GPT-4o or GPT-4o-mini (recommended)
   - Embedding Model: text-embedding-3-small
4. Configure search settings:
   - Search Engine: Brave Search (default)
   - Brave API Key: (should auto-fill from .env.local)
5. Click "Complete Setup"

## Features

### Clean UI
- Modern, responsive design
- Dark/Light theme support
- Sidebar with chat history
- Real-time streaming responses

### Smart Search
- **Web Search**: Powered by Brave Search API
- **Academic Search**: Research papers and scholarly articles
- **Image Search**: Visual content discovery
- **Video Search**: YouTube and video content
- **Weather Widget**: Current weather information
- **News Widget**: Latest news articles

### AI Chat Modes
- **Speed Mode**: Quick responses (1 search iteration)
- **Balanced Mode**: Moderate depth (multiple searches)
- **Quality Mode**: Thorough research (5-6+ search iterations)

## Configuration Options

### Search Engines
You can choose between:
- **Brave Search** (recommended): Fast, clean results with API key
- **SearXNG**: Self-hosted meta-search engine

To switch search engines:
1. Open Settings in the app
2. Go to "Search" section
3. Change "Search Engine" dropdown
4. Save settings

### AI Providers
Supported providers:
- OpenAI (GPT-4, GPT-4o, GPT-4o-mini)
- Anthropic (Claude)
- Google (Gemini)
- Groq
- Ollama (local models)
- And more...

## File Structure

```
tabkeep-app/
├── Perplexica/                    # Main UI (Next.js app)
│   ├── src/
│   │   ├── app/                   # Pages and routes
│   │   ├── components/            # React components
│   │   ├── lib/                   # Core functionality
│   │   │   ├── agents/            # Search agents
│   │   │   ├── config/            # Configuration management
│   │   │   ├── models/            # AI model providers
│   │   │   ├── braveSearch.ts     # NEW: Brave Search integration
│   │   │   └── searxng.ts         # SearXNG integration
│   │   └── ...
│   ├── .env.local                 # Environment variables
│   └── package.json
├── midnight-canvas-280c088a.old/  # Backup of old UI
├── dev-api-server.js              # Development API server
└── package.json                   # Root package.json
```

## Troubleshooting

### "Failed to connect to server"
- Check that both API server and frontend are running
- Verify ports 3000 and 3001 are not in use

### "Brave Search API error"
- Verify your BRAVE_API_KEY in .env.local is correct
- Check you haven't exceeded the 2,000 searches/month limit
- Try switching to SearXNG in settings

### "OpenAI API error"
- Verify your OPENAI_API_KEY in .env.local is correct
- Ensure you have credits in your OpenAI account
- Check the API key has proper permissions

### Setup wizard keeps appearing
- The setup wizard appears if configuration is incomplete
- Ensure you've set up at least one AI provider with valid credentials
- Check that Perplexica/data/config.json was created

## Tips for Best Experience

1. **Use GPT-4o-mini** for faster, cheaper responses
2. **Enable "Auto video & image search"** in preferences for richer results
3. **Use Quality Mode** for complex research questions
4. **Use Speed Mode** for quick, simple queries
5. **Add system instructions** in settings to customize AI behavior

## Next Steps

- Customize your preferences in Settings
- Try different search modes
- Explore the chat history in the sidebar
- Add multiple AI providers for redundancy
- Set up custom system instructions for personalized responses

Enjoy your new Perplexica-powered TabKeep experience!
