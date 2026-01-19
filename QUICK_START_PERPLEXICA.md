# Quick Start Guide - Perplexica AI Search

## 🚀 Get Started in 3 Steps

### Step 1: Add Your OpenAI API Key

Edit `midnight-canvas-280c088a/.env.local`:

```bash
VITE_OPENAI_API_KEY=sk-your-key-here
```

Get your key from: https://platform.openai.com/api-keys

### Step 2: Start the Servers

**Terminal 1 - API Server:**
```bash
node dev-api-server.js
```

**Terminal 2 - Frontend:**
```bash
cd midnight-canvas-280c088a
npm run dev
```

### Step 3: Open Your Browser

Navigate to: http://localhost:5173

## ✨ Features You Can Try

1. **Ask anything** - Type a question and get AI-powered answers
2. **Upload files** - Click the paperclip icon to upload PDFs, DOCX, or TXT files
3. **Change modes** - Click the ⚡ icon to switch between Speed, Balanced, and Quality modes
4. **View sources** - See cited sources at the bottom of each answer

## 📁 What Changed

### New Files Created:
```
✅ PERPLEXICA_INTEGRATION.md          # Full documentation
✅ QUICK_START_PERPLEXICA.md          # This file
✅ api/perplexica/chat.js             # AI chat backend
✅ api/perplexica/upload.js           # File upload handler
✅ src/contexts/PerplexicaChatContext.tsx
✅ src/components/perplexica/
   ├── PerplexicaChat.tsx
   ├── PerplexicaMessageBox.tsx
   ├── PerplexicaMessageInput.tsx
   └── OptimizationModeSelector.tsx
```

### Modified Files:
```
📝 dev-api-server.js                  # Added Perplexica routes
📝 src/pages/Index.tsx                # Replaced search with Perplexica chat
📝 package.json (root)                # Added multer
📝 midnight-canvas-280c088a/package.json # Added react-textarea-autosize, framer-motion, @headlessui/react, rfc6902
```

## 🎯 Next Steps (Optional)

### Add Real Web Search
Currently using mock sources. To get real search results:

```bash
# Option 1: Tavily (recommended)
# Get key from: https://tavily.com
npm install axios
# Add to .env.local: TAVILY_API_KEY=tvly-...
# Update api/perplexica/chat.js searchWeb() function

# Option 2: SerpAPI
# Get key from: https://serpapi.com
```

### Enable PDF/DOCX Parsing
```bash
npm install pdf-parse mammoth
# Update api/perplexica/upload.js extractText() function
```

See `PERPLEXICA_INTEGRATION.md` for detailed instructions.

## 🐛 Troubleshooting

**Q: "OpenAI API key not configured"**
A: Add VITE_OPENAI_API_KEY to .env.local and restart both servers

**Q: Blank page or errors?**
A: Check browser console (F12) and terminal for errors

**Q: File uploads not working?**
A: Ensure multer is installed: `npm install multer`

**Q: Want the old search back?**
A: The old code is still in the repo. You can create a toggle or revert Index.tsx

## 💡 Tips

- **Speed Mode**: Fast, cheap responses (GPT-4o-mini)
- **Balanced Mode**: Default, good for most queries
- **Quality Mode**: Slower, more detailed (GPT-4o, costs more)
- **File Size**: Max 10MB per file, 5 files max
- **Supported Files**: TXT (full support), PDF/DOCX (basic - upgrade recommended)

Enjoy your new AI-powered search! 🎉
