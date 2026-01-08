# TabKeep Chrome Extension

> **Too many tabs. One calm place.**

A modern, beautiful Chrome extension for intelligent tab management. Built from scratch with a clean architecture and stunning UI.

## Features

### ✨ Core Features

- **Auto-Close Timer** - Automatically close inactive tabs after 2 hours
- **Tab List** - Beautiful, organized view of all your tabs
- **Quick Actions** - One-click access to common tasks
- **Smart Tab Tracking** - Track tab activity and usage patterns

### 🚀 Quick Actions

1. **AI Assistant** - Get intelligent suggestions about your tabs
2. **Bookmark All** - Save all current tabs to a timestamped folder
3. **Collapse All** - Close all tabs except the active one

### 🎨 Design

Based on modern UI principles with:
- Clean, minimalist interface
- Purple/blue gradient accent colors
- Smooth animations and transitions
- Native Chrome OS aesthetic
- Responsive and accessible

## Installation

### Development Mode

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `extension` folder

### Production

Install from the Chrome Web Store: [Coming Soon]

## Project Structure

```
extension/
├── manifest.json              # Extension manifest (Manifest V3)
├── popup/                     # Popup UI
│   ├── popup.html            # Popup structure
│   ├── popup.css             # Popup styles
│   └── popup.js              # Popup logic
├── scripts/                   # Background scripts
│   ├── background.js         # Service worker
│   └── content.js            # Content script
├── assets/                    # Static assets
│   └── icons/                # Extension icons
│       ├── icon-16.png       # 16x16 icon
│       ├── icon-32.png       # 32x32 icon
│       ├── icon-48.png       # 48x48 icon
│       ├── icon-128.png      # 128x128 icon
│       └── default-avatar.svg # Default user avatar
└── README.md                  # This file
```

## Architecture

### Manifest V3

This extension uses Chrome's Manifest V3 architecture:
- **Service Worker** - Background tasks and tab tracking
- **Content Scripts** - Page activity monitoring
- **Popup** - User interface for tab management

### Components

#### 1. Popup (`popup/`)
- Main user interface
- Displays active tabs
- Quick action buttons
- Settings toggle

#### 2. Background Service Worker (`scripts/background.js`)
- Tracks tab creation, activation, and removal
- Manages auto-close timers
- Handles tab statistics
- Processes messages from popup

#### 3. Content Script (`scripts/content.js`)
- Monitors user activity on pages
- Tracks tab engagement
- Sends activity updates to background

## Permissions

This extension requires the following permissions:

- `tabs` - Access tab information
- `storage` - Store user settings and preferences
- `activeTab` - Interact with the current tab

## Settings

### Auto-Close Timer

- **Default**: Enabled
- **Interval**: 2 hours of inactivity
- **Exclusions**: Pinned tabs, active tabs
- **Toggle**: Click the timer button in the featured card

## Development

### Prerequisites

- Chrome browser (v88+)
- Basic knowledge of HTML, CSS, JavaScript

### Getting Started

1. Make changes to the source files
2. Reload the extension in `chrome://extensions/`
3. Test your changes in the popup

### Code Style

- ES6+ JavaScript
- Async/await for promises
- Class-based architecture
- Clean, commented code

## Roadmap

### v1.1 (Planned)
- [ ] Tab grouping by domain
- [ ] Custom auto-close intervals
- [ ] Tab search functionality
- [ ] Keyboard shortcuts

### v1.2 (Planned)
- [ ] Tab notes and annotations
- [ ] Session saving and restoration
- [ ] Tab analytics dashboard
- [ ] Sync with TabKeep.app web dashboard

### v2.0 (Future)
- [ ] AI-powered tab suggestions
- [ ] Smart tab categorization
- [ ] Tab deduplication
- [ ] Export tab history

## Web Dashboard

TabKeep also includes a full web dashboard at [tabkeep.app](https://tabkeep.app) with:
- Advanced analytics
- VPN integration
- Theme customization
- Premium features

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with gradients and animations
- **Vanilla JavaScript** - ES6+ with classes
- **Chrome APIs** - Tabs, Storage, Runtime, Bookmarks

## Contributing

This is a new project rebuilt from scratch. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Copyright © 2026 TabKeep

## Links

- **Website**: [tabkeep.app](https://tabkeep.app)
- **Support**: [tabkeep.app/support](https://tabkeep.app/support)
- **Twitter**: [@tabkeep](https://twitter.com/tabkeep)

---

**Built with ❤️ for a calmer browsing experience.**
