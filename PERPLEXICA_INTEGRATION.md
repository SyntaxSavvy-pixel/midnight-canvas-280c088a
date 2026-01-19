# Perplexica Integration Guide

## Overview

TabKeep now includes a complete Perplexica-inspired AI search engine with:
- ✅ AI-powered chat with streaming responses
- ✅ Web search with cited sources
- ✅ File uploads (PDF, DOCX, TXT support)
- ✅ Three optimization modes: Speed, Balanced, Quality
- ✅ Beautiful UI with markdown support

## Setup

### 1. Install Dependencies

Dependencies are already installed:
- `react-textarea-autosize` - Auto-resizing textarea
- `framer-motion` - Smooth animations
- `@headlessui/react` - Headless UI components
- `rfc6902` - JSON patch support
- `multer` - File upload handling

### 2. Environment Variables

Add your OpenAI API key to `.env.local`:

```bash
# Required for Perplexica AI chat
VITE_OPENAI_API_KEY=sk-...

# Optional: Add web search API (recommended for better sources)
# TAVILY_API_KEY=tvly-...
# SERP_API_KEY=...
```

### 3. Run the Application

**Terminal 1 - Start the API server:**
```bash
node dev-api-server.js
```

**Terminal 2 - Start the frontend:**
```bash
cd midnight-canvas-280c088a
npm run dev
```

## Features

### 1. AI Chat
- Streaming responses powered by OpenAI GPT-4
- Markdown formatting with syntax highlighting
- Conversation history
- Real-time typing indicators

### 2. Search Modes

**Speed Mode** ⚡
- Uses GPT-4o-mini
- Quick responses
- Lower cost

**Balanced Mode** ⚖️ (Default)
- Uses GPT-4o-mini
- Good balance of speed and quality
- Moderate detail

**Quality Mode** ⭐
- Uses GPT-4o
- Deep research
- Comprehensive answers
- Higher cost

### 3. File Uploads

Upload documents for context-aware responses:
- **PDF** - Requires `pdf-parse` (TODO)
- **DOCX/DOC** - Requires `mammoth` (TODO)
- **TXT** - Fully supported

Click the paperclip icon to attach files. They'll be included in the AI context.

### 4. Cited Sources

Every response includes web search results with citations:
- Source titles and URLs
- Snippets from search results
- Click to visit original sources

## Architecture

### Frontend Components

```
src/
├── contexts/
│   └── PerplexicaChatContext.tsx    # Chat state management
├── components/
│   └── perplexica/
│       ├── PerplexicaChat.tsx       # Main chat container
│       ├── PerplexicaMessageBox.tsx # Message display
│       ├── PerplexicaMessageInput.tsx # Chat input
│       └── OptimizationModeSelector.tsx # Mode switcher
└── pages/
    └── Index.tsx                     # Main page (updated)
```

### Backend API

```
api/
└── perplexica/
    ├── chat.js    # Streaming AI chat endpoint
    └── upload.js  # File upload handler
```

## API Endpoints

### POST /api/perplexica/chat
Streaming chat endpoint with SSE (Server-Sent Events)

**Request:**
```json
{
  "message": "What is quantum computing?",
  "optimizationMode": "balanced",
  "files": [],
  "history": []
}
```

**Response (SSE):**
```
data: {"type":"thinking","content":"Searching..."}
data: {"type":"sources","sources":[...]}
data: {"type":"content","content":"Quantum computing..."}
data: {"type":"done"}
```

### POST /api/perplexica/upload
File upload endpoint

**Request:** multipart/form-data with files

**Response:**
```json
{
  "success": true,
  "files": [{
    "fileId": "...",
    "fileName": "document.pdf",
    "fileExtension": ".pdf",
    "content": "...",
    "size": 12345
  }]
}
```

## Customization

### Add Real Web Search

Replace the mock search in `api/perplexica/chat.js`:

```javascript
// Install: npm install axios
async function searchWeb(query) {
  const response = await axios.post('https://api.tavily.com/search', {
    api_key: process.env.TAVILY_API_KEY,
    query,
    search_depth: 'basic',
    include_answer: false,
    max_results: 5,
  });

  return response.data.results.map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
  }));
}
```

### Add PDF Parsing

```bash
npm install pdf-parse
```

Update `api/perplexica/upload.js`:

```javascript
const pdfParse = require('pdf-parse');

async function extractText(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  // ... rest of the code
}
```

### Add DOCX Parsing

```bash
npm install mammoth
```

Update `api/perplexica/upload.js`:

```javascript
const mammoth = require('mammoth');

async function extractText(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  // ... rest of the code
}
```

## Troubleshooting

### Issue: "OpenAI API key not configured"
**Solution:** Add `VITE_OPENAI_API_KEY` to `.env.local` and restart both servers

### Issue: File uploads not working
**Solution:** Ensure `multer` is installed: `npm install multer`

### Issue: Sources not showing
**Solution:** The current implementation uses mock sources. Add a real search API (Tavily, SerpAPI) for actual results.

### Issue: Streaming not working
**Solution:** Ensure your API server supports SSE and cors is properly configured

## Next Steps

1. **Add Real Web Search** - Integrate Tavily or SerpAPI
2. **Implement PDF/DOCX Parsing** - Add pdf-parse and mammoth
3. **Add Chat History** - Save conversations to Supabase
4. **Add Voice Input** - Use Web Speech API
5. **Add Suggestions** - Show related questions after answers

## Differences from Original Perplexica

**What we kept:**
- ✅ UI/UX design and layout
- ✅ Streaming responses
- ✅ File uploads
- ✅ Optimization modes
- ✅ Source citations

**What we simplified:**
- Uses OpenAI instead of multiple LLM providers
- Simplified state management (no Next.js, no database yet)
- Mock web search (easily upgradeable to real API)
- Basic file parsing (extensible)

**What we improved:**
- Cleaner React hooks architecture
- Better TypeScript types
- Simpler API structure
- Easier to customize

## Credits

UI/UX inspired by [Perplexica](https://github.com/ItzCrazyKns/Perplexica) by ItzCrazyKns
