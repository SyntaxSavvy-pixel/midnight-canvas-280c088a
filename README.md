# TabKeep.app

> **Too many tabs. One calm place.**

A complete tab management solution with a modern Chrome extension and beautiful web dashboard.

## Project Structure

```
tabkeep-app/
├── nest-flow/           # React web application (tabkeep.app)
│   ├── src/            # React source code
│   ├── public/         # Static assets
│   └── package.json    # Web app dependencies
│
├── extension/          # Chrome Extension
│   ├── manifest.json  # Extension manifest (V3)
│   ├── popup/         # Popup UI (HTML, CSS, JS)
│   ├── scripts/       # Background & content scripts
│   ├── assets/        # Icons and images
│   └── README.md      # Extension documentation
│
└── README.md          # This file
```

## Two Products, One Experience

### 1. TabKeep Chrome Extension

**Smart tab management in your browser**

- Auto-close inactive tabs
- Beautiful popup interface
- Quick actions (AI, Bookmark, Collapse)
- Tab tracking and analytics
- Native Chrome integration

[View Extension Docs →](./extension/README.md)

### 2. TabKeep Web Dashboard (nest-flow)

**Full-featured web application**

- 11 pages with complete routing
- Beautiful landing page with animations
- User authentication (Google OAuth + Email)
- Dashboard with analytics
- VPN integration (Sembold partnership)
- Theme customization (6 colors + dark/light mode)
- Subscription management (Free, Pro, Lifetime)
- 74+ UI components

**Tech Stack:**
- React 18 + TypeScript
- Vite build system
- Tailwind CSS + shadcn/ui
- Supabase backend
- Framer Motion animations

[Visit tabkeep.app →](https://tabkeep.app)

## Getting Started

### Chrome Extension

```bash
# 1. Add extension icons (see extension/SETUP.md)
# 2. Load in Chrome
# Open chrome://extensions/ → Enable Developer Mode → Load Unpacked
# 3. Select the extension/ folder
```

[Full Setup Guide →](./extension/SETUP.md)

### Web Dashboard

```bash
# Navigate to web app
cd nest-flow

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:8080
```

The web app is already production-ready with:
- Supabase integration configured
- All routes implemented
- Complete UI components
- Theme system working
- Authentication flows ready

## Architecture

### Chrome Extension Architecture

```
User clicks icon
    ↓
popup.html opens
    ↓
popup.js fetches tabs via Chrome API
    ↓
Displays tabs + quick actions
    ↓
User actions trigger background.js
    ↓
Service worker manages timers & tracking
```

### Web App Architecture

```
Landing Page (/)
    ↓
User signs up (/auth)
    ↓
Supabase authentication
    ↓
Dashboard (/dashboard)
    ↓
Analytics, VPN, Profile, Themes, Subscription pages
```

## Features

### Extension Features
- ✅ Auto-close timer (2-hour default)
- ✅ Tab list with favicons
- ✅ Bookmark all tabs
- ✅ Collapse all tabs
- ✅ Activity tracking
- ✅ Beautiful UI matching design
- 🔄 AI assistant (opens dashboard)
- 🔄 Sync with web dashboard

### Web Dashboard Features
- ✅ Landing page with animations
- ✅ Authentication (Google OAuth + Email)
- ✅ Dashboard with stats
- ✅ Analytics with charts
- ✅ VPN integration UI
- ✅ Theme customization
- ✅ Subscription management
- ✅ Profile settings
- ✅ Privacy & Terms pages
- 🔄 Real-time tab sync with extension
- 🔄 AI-powered suggestions

## Branding

### Identity
- **Name**: TabKeep
- **Tagline**: "Too many tabs. One calm place."
- **Domain**: tabkeep.app
- **Mascot**: Friendly bird (nest theme)
- **Metaphor**: Tabs are "collected" into a nest

### Design System
- **Primary Color**: Teal (#14B8A6)
- **Accent**: Purple/Blue gradient (#6366F1 → #8B5CF6)
- **Fonts**: Fraunces (display), DM Sans (body)
- **Style**: Warm, calm, organic shapes
- **Mood**: Peaceful, organized, friendly

### Visual Elements
- Floating leaves animations
- Bird mascot illustrations
- Soft shadows and glows
- Rounded corners throughout
- Warm cream colors (light mode)
- Deep navy (dark mode)

## Development

### Extension Development

```bash
# Make changes to extension files
# Reload extension in chrome://extensions/
# Click refresh icon on TabKeep card
```

### Web Development

```bash
cd nest-flow
npm run dev    # Start dev server
npm run build  # Build for production
npm run lint   # Run ESLint
```

## Deployment

### Chrome Extension
1. Create icon assets (16, 32, 48, 128px)
2. Test thoroughly in Chrome
3. Zip the extension folder
4. Submit to Chrome Web Store
5. Add screenshots and description

### Web Dashboard
The nest-flow app can be deployed to:
- **Vercel** (recommended for Vite + React)
- **Netlify**
- **Cloudflare Pages**

Already configured with:
- Supabase backend
- Environment variables in `.env`
- Production build ready

## Links

- **Website**: https://tabkeep.app
- **Twitter**: @tabkeep
- **Support**: Coming soon

## Project History

**Previous**: Tabmangment extension (168 files, 35+ pages, legacy codebase)

**Now**: Complete rebuild from scratch
- Deleted all old code (SQL, HTML, JS, CSS, MD files)
- Preserved only nest-flow (new React app)
- Renamed repository to tabkeep-app
- Built new Chrome extension with modern UI
- Clean architecture, fresh start

## Tech Stack Summary

### Extension
- Vanilla JavaScript (ES6+)
- Chrome Extension Manifest V3
- CSS3 with gradients & animations
- Chrome APIs (tabs, storage, bookmarks)

### Web App
- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui (52 components)
- Supabase
- React Router
- Framer Motion
- Recharts

## License

Copyright © 2026 TabKeep

---

**Built with ❤️ for a calmer browsing experience.**
