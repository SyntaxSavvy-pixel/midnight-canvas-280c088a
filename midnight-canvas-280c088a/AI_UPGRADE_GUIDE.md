# 🚀 AI Upgrade Guide - GPT-4 & Claude Integration

## Overview

Your search has been upgraded with advanced AI capabilities:

- **Intelligent "Thinking" Search** - Like Perplexity, the AI now analyzes your query before searching
- **GPT-4 & Claude Support** - Use the latest AI models from OpenAI and Anthropic
- **Web Search Integration** - AI can synthesize answers from real-time search results
- **Smart Result Ranking** - Better relevance scoring using advanced AI
- **Multi-Provider Fallback** - Automatically falls back to Groq if primary providers aren't configured

## ✨ What's New

### 1. AI Thinking Process (Like Perplexity)
When you search, the AI now:
1. Analyzes what you're really looking for
2. Determines the best platforms to search
3. Refines your query for better results
4. Creates a search strategy

You'll see this "thinking" process displayed in real-time!

### 2. Advanced AI Models
- **OpenAI GPT-4 Turbo**: Best overall performance, training data through April 2024
- **Claude 3.5 Sonnet**: Excellent reasoning, training data through April 2024
- **Groq Llama 3.3**: Free fallback option (training data through 2023)

### 3. Intelligent Result Synthesis
Instead of just showing raw search results, the AI now:
- Synthesizes information from multiple sources
- Provides a comprehensive answer to your query
- Includes source citations like Perplexity
- Ranks results by actual relevance, not just popularity

## 🔑 Setup Instructions

### Option 1: OpenAI GPT-4 (Recommended)

1. **Get API Key**:
   - Go to https://platform.openai.com/api-keys
   - Sign in or create account
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)

2. **Add to Environment**:
   ```bash
   # In your .env.local file:
   VITE_OPENAI_API_KEY=sk-your-actual-key-here
   ```

3. **Pricing**: Pay-as-you-go (~$0.01-0.03 per search with AI analysis)
   - First $5 free credit for new accounts
   - Very affordable for personal use

### Option 2: Anthropic Claude

1. **Get API Key**:
   - Go to https://console.anthropic.com/settings/keys
   - Sign in or create account
   - Click "Create Key"
   - Copy the key (starts with `sk-ant-`)

2. **Add to Environment**:
   ```bash
   # In your .env.local file:
   VITE_ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
   ```

3. **Pricing**: Pay-as-you-go (~$0.01-0.03 per search)
   - $5 free credit for new accounts
   - Excellent quality, similar pricing to OpenAI

### Option 3: Groq (Free - Already Configured)

You already have Groq configured! It's completely free but:
- Training data only goes through 2023
- Not as capable for complex reasoning
- Still works great for basic searches

## 🎯 How It Works

### Before (Old System)
```
User searches → Call APIs → Show raw results → Basic sorting
```

### After (New System)
```
User searches
  ↓
AI Thinking Phase (analyzes query, selects strategy)
  ↓
Enhanced Search (uses AI-refined query)
  ↓
AI Ranking (relevance scoring with GPT-4/Claude)
  ↓
AI Synthesis (creates comprehensive answer with citations)
  ↓
Display intelligent results
```

## 📊 Comparison

| Feature | LLaMA 3.3 (Groq) | GPT-4 Turbo | Claude 3.5 |
|---------|------------------|-------------|------------|
| **Cost** | FREE | ~$0.01-0.03/search | ~$0.01-0.03/search |
| **Training Data** | Up to 2023 | Up to Apr 2024 | Up to Apr 2024 |
| **Speed** | Very Fast | Fast | Fast |
| **Reasoning** | Good | Excellent | Excellent |
| **Web Knowledge** | Limited (2023) | Better (2024) | Better (2024) |
| **Best For** | Free tier | Best overall | Complex reasoning |

## 🔧 Configuration

The system automatically selects the best available AI provider:

1. **OpenAI GPT-4** (if configured) - Best choice
2. **Claude 3.5** (if configured) - Great alternative
3. **Groq Llama** (free fallback) - Works without setup

You can have all three configured and the system will use the best one available.

## 🚀 Quick Start

1. **Get an API key** (choose one):
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/settings/keys
   - Or stick with Groq (already set up, free)

2. **Add to .env.local**:
   ```bash
   VITE_OPENAI_API_KEY=sk-your-key-here
   # OR
   VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

3. **Restart dev server**:
   ```bash
   npm run dev
   ```

4. **Start searching!** You'll see:
   - AI thinking process displayed
   - "Powered by GPT-4" or "Powered by Claude" badge
   - Intelligent answer synthesis
   - Better ranked results

## 💡 Pro Tips

### Cost Optimization
- Use Groq for simple searches (free)
- Use GPT-4/Claude for complex questions
- Both OpenAI and Anthropic offer free credits to start

### Best Practices
- GPT-4 is best for general searches
- Claude excels at complex reasoning and analysis
- Groq is perfect when you want zero cost

### Future Updates
We're working on:
- Real-time web scraping for 2026 data
- Custom AI provider selection per search
- Caching to reduce API costs
- Smarter query understanding

## 🛠️ Troubleshooting

### "No AI provider configured" error
- Make sure you added the API key to `.env.local`
- Restart your dev server after adding keys
- Check that the key starts with `sk-` (OpenAI) or `sk-ant-` (Claude)

### API key not working
- Verify the key is correct (copy/paste again)
- Check you have credits/billing set up (for OpenAI/Claude)
- Groq should work immediately (free)

### Thinking phase takes too long
- This is normal for the first search
- Subsequent searches are faster
- Consider using Groq for speed, GPT-4 for quality

## 📚 Learn More

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [Groq AI Docs](https://console.groq.com/docs)

## 🎉 Enjoy!

Your search is now powered by state-of-the-art AI that thinks intelligently about your queries before searching, just like Perplexity!
