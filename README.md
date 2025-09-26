# 🚀 Tabmangment - Professional Tab Management Extension

A powerful Chrome extension for managing browser tabs with smart auto-closing, timers, and premium features.

## ✨ Features

### 🎯 Core Features
- **Smart Auto-Close**: Set timers on tabs to automatically close them
- **Tab Organization**: Organize and manage your browser tabs efficiently
- **Professional UI**: Clean, modern interface with circular login button
- **Timer Management**: Precise control over tab lifetimes

### 🔐 Authentication & Premium
- **User Authentication**: Secure login system with elegant UI
- **Premium Plans**: Upgrade to Pro for enhanced features
- **Payment Integration**: Stripe-powered subscription management
- **Real-time Sync**: Seamless experience across sessions

### 🎨 Design
- **Glass Morphism**: Modern glass-effect styling
- **Circular Login Button**: Beautiful gradient login button in top right
- **Responsive Design**: Works perfectly on all screen sizes
- **Smooth Animations**: Buttery smooth hover and transition effects

## 🏗️ Project Structure

```
Tabmangment/
├── manifest.json           # Chrome extension manifest
├── background.js           # Extension background service worker
├── popup.html             # Extension popup interface
├── popup.js               # Extension popup logic
├── content.js             # Content script for web pages
├── index.html             # Main landing page with circular login
├── quick-login.html       # Authentication page
├── dashboard.html         # User dashboard
├── api/                   # Server API endpoints
│   ├── me.js             # User info endpoint
│   ├── stripe-webhook.js # Payment webhook
│   └── ...               # Other API routes
├── icons/                # Extension icons
└── package.json          # Project configuration
```

## 🚀 Getting Started

### For Users
1. **Install Extension**: Load the extension in Chrome
2. **Create Account**: Click the circular login button in top right
3. **Start Managing**: Set timers and organize your tabs
4. **Upgrade to Pro**: Unlock premium features

### For Developers
1. **Clone Repository**: `git clone [repository-url]`
2. **Install Dependencies**: `npm install`
3. **Load Extension**: Load unpacked extension in Chrome
4. **Start Development**: Modify and test your changes

## 🔧 Installation

### Chrome Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the Tabmangment folder
5. The extension will appear in your toolbar

### Web Interface
1. Open `index.html` in your browser
2. Click the circular login button to authenticate
3. Access your dashboard and premium features

## 💳 Premium Features

### Pro Plan Includes:
- **Unlimited Tabs**: No limit on active tab management
- **Advanced Timers**: Sophisticated scheduling options
- **Priority Support**: Direct access to support team
- **Enhanced UI**: Additional themes and customization

## 🛠️ Technical Details

- **Platform**: Chrome Extension Manifest V3
- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js with Serverless Functions
- **Payment**: Stripe Integration
- **Authentication**: JWT-based user sessions

## 📞 Support

For support, feature requests, or bug reports:
- **Issues**: Use GitHub Issues for bug reports
- **Features**: Submit feature requests via Issues
- **Contact**: Reach out through the extension's support page

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Made with ❤️ for better tab management**