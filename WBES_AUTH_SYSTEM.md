# WBES Authentication & Sync System

## Overview

The **WBES (Web Browser Extension Sync)** system enables seamless authentication and data synchronization between the TabKeep web application and Chrome extension.

## Architecture

```
┌─────────────────┐
│   Web App       │
│  (Next.js)      │
└────────┬────────┘
         │
         │ 1. User logs in
         │ 2. Generate WBES token
         │ 3. postMessage
         ▼
┌─────────────────┐
│ Content Script  │ ◄─── Runs on tabkeep.app pages
│ (content.js)    │
└────────┬────────┘
         │
         │ 4. chrome.runtime.sendMessage
         ▼
┌─────────────────┐
│ Background      │ ◄─── Service Worker
│ (background.js) │
└────────┬────────┘
         │
         │ 5. chrome.storage.sync.set
         ▼
┌─────────────────┐
│ Extension       │ ◄─── Popup UI
│ (popup.js)      │
└─────────────────┘
```

## Components

### 1. Sync Token System (`nest-flow/src/lib/syncToken.ts`)

Generates unique WBES tokens for user identification:

- **Format**: `WBES` + 50 random alphanumeric characters
- **Example**: `WBESa3kD9fL2mN7pQ8rS1tV4wX6yZ0bC5eG8hJ3kL7mN2pQ4rS9tV1wX`
- **Collision Detection**: If token exists, uses fallback prefixes (WBSA, WBSB, WBSC...)
- **Functions**:
  - `generateSyncToken()`: Creates a random token with prefix
  - `validateSyncToken()`: Validates token format
  - `generateUniqueSyncToken()`: Generates token with collision detection
  - `checkTokenCollision()`: Checks if token exists in database

### 2. User Profile Service (`nest-flow/src/lib/userProfile.ts`)

Manages user profiles and sync tokens:

- Auto-generates sync token on first login
- Stores token in Supabase user metadata
- Handles avatar sync between web and extension
- **Key Function**: `getUserProfile()` - Gets or creates sync token

### 3. Extension Auth Page (`nest-flow/src/app/extension-auth/page.tsx`)

Authentication bridge page:

- **URL**: `https://tabkeep.app/extension-auth`
- **Flow**:
  1. Checks if user is logged in
  2. Gets or generates WBES token
  3. Sends auth data to extension via `window.postMessage`
  4. Displays success screen with token

### 4. Extension Content Script (`extension/scripts/content.js`)

Message relay between web and extension:

- **Runs on**: All tabkeep.app pages
- **Function**: `setupAuthBridge()`
- **Listens for**: `window.postMessage` with type `TABKEEP_AUTH_SUCCESS`
- **Relays to**: Background script via `chrome.runtime.sendMessage`
- **Security**: Validates origin before relaying messages

### 5. Extension Background Script (`extension/scripts/background.js`)

Handles auth messages and storage:

- **Function**: `handleAuthSuccess(authData)`
- **Stores in**: `chrome.storage.sync` with keys:
  - `tabkeepSyncToken`
  - `tabkeepUserId`
  - `tabkeepUserEmail`
  - `userAvatar`
  - `authTimestamp`
- **Broadcasts**: Auth state changes to popup

### 6. Extension Popup (`extension/popup/`)

User interface:

- **Auth Check**: Loads auth screen if not authenticated
- **Get Started Button**: Opens `tabkeep.app/extension-auth`
- **Main View**: Shows after authentication
- **Avatar Sync**: Displays pixel avatar from web

## Authentication Flow

### Step-by-Step

1. **User Opens Extension**
   ```javascript
   // popup.js checks authentication
   const { tabkeepSyncToken, tabkeepUserId } = await chrome.storage.sync.get([...]);
   if (!tabkeepSyncToken) {
     showAuthScreen();
   }
   ```

2. **User Clicks "Get Started"**
   ```javascript
   // Opens tabkeep.app/extension-auth in new tab
   chrome.tabs.create({ url: 'https://www.tabkeep.app/extension-auth' });
   ```

3. **Web App Generates Token**
   ```javascript
   // extension-auth/page.tsx
   const profile = await getUserProfile();
   // Returns: { syncToken: 'WBES...', userId: '...', avatarId: '...' }
   ```

4. **Web App Sends to Content Script**
   ```javascript
   window.postMessage({
     type: 'TABKEEP_AUTH_SUCCESS',
     syncToken: 'WBES...',
     userId: '...',
     userEmail: '...',
     avatarId: '...'
   }, window.location.origin);
   ```

5. **Content Script Relays to Background**
   ```javascript
   // content.js receives and relays
   chrome.runtime.sendMessage(authMessage);
   ```

6. **Background Script Stores Data**
   ```javascript
   // background.js stores in sync storage
   await chrome.storage.sync.set({
     tabkeepSyncToken: authData.syncToken,
     tabkeepUserId: authData.userId,
     // ...
   });
   ```

7. **Extension Syncs**
   ```javascript
   // popup.js reloads and shows main view
   chrome.storage.onChanged.addListener((changes) => {
     if (changes.tabkeepSyncToken) {
       window.location.reload();
     }
   });
   ```

## Database Schema

### Supabase Profiles Table

Add sync token column:

```sql
-- Run: nest-flow/supabase-add-sync-token.sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS sync_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_sync_token
ON public.profiles(sync_token);
```

## Security Considerations

1. **Origin Validation**
   - Content script validates message origin before relaying
   - Only accepts messages from tabkeep.app domains

2. **Token Uniqueness**
   - Collision detection ensures unique tokens
   - 50 character random string provides high entropy

3. **HTTPS Only**
   - Extension only accepts https://tabkeep.app connections
   - Localhost allowed for development

4. **Storage Security**
   - Uses `chrome.storage.sync` which is encrypted
   - Tokens stored per-browser, synced across devices

## Testing the System

### Prerequisites
1. Deploy SQL migration to Supabase
2. Deploy web app to production
3. Load extension in Chrome (Developer Mode)

### Test Flow
1. Open extension → See "Get Started" screen
2. Click "Get Started" → Opens tabkeep.app/extension-auth
3. Log in if needed → See success screen with token
4. Return to extension → See main view with avatar
5. Verify sync: Change avatar on web → Updates in extension

### Debug Console Logs

**Web (extension-auth page):**
```
📤 Sending auth message to extension...
✅ Auth message posted to content script
✅ Auth data saved to localStorage
✅ Auth confirmed by extension!
```

**Content Script:**
```
🔗 TabKeep auth bridge initialized on tabkeep.app
🔐 Auth message received from web page, relaying to extension...
✅ Auth message relayed successfully
```

**Background Script:**
```
🔐 Auth success received in background
✅ Auth data saved to storage
Sync Token: WBESa3kD9f...
User ID: 123e4567-e89b-12d3-a456-426614174000
```

**Popup:**
```
✅ User authenticated with sync token: WBESa3kD9f...
```

## Deployment Checklist

### Database
- [ ] Run `supabase-add-sync-token.sql` in Supabase SQL Editor
- [ ] Verify `sync_token` column added to `profiles` table
- [ ] Verify index `idx_profiles_sync_token` created

### Web App
- [ ] Deploy to Vercel/production
- [ ] Test `/extension-auth` route
- [ ] Verify sync token generation works
- [ ] Test avatar sync

### Extension
- [ ] Update manifest.json version
- [ ] Test in Chrome Developer Mode
- [ ] Verify auth flow
- [ ] Test avatar display
- [ ] Zip for Chrome Web Store

### Chrome Web Store
- [ ] Package extension
- [ ] Update description with sync feature
- [ ] Add screenshots showing auth flow
- [ ] Submit for review

## Troubleshooting

### Extension doesn't receive auth message
- Check if content script is running on tabkeep.app
- Open DevTools → Console → Look for "TabKeep auth bridge initialized"
- Verify origin validation in content.js

### Token not syncing
- Check chrome.storage.sync quota (100KB limit, 8KB per item)
- Verify background script is running
- Check if user is logged into Chrome sync

### Avatar not displaying
- Verify `getAvatarById()` function exists in pixelAvatars.js
- Check CSS for `.pixel-avatar` class
- Verify avatar SVG is being inserted into DOM

## Future Enhancements

1. **Token Refresh**: Implement token expiration and refresh
2. **Multi-Device Sync**: Real-time sync across devices via WebSockets
3. **Offline Support**: Queue auth requests when offline
4. **Token Revocation**: Allow users to revoke tokens from dashboard
5. **Analytics**: Track auth success/failure rates

## File Structure

```
tabkeep-app/
├── nest-flow/
│   ├── src/
│   │   ├── app/
│   │   │   └── extension-auth/
│   │   │       └── page.tsx              # Auth bridge page
│   │   └── lib/
│   │       ├── syncToken.ts              # Token generation
│   │       └── userProfile.ts            # User profile & sync
│   ├── supabase-add-sync-token.sql       # DB migration
│   └── supabase-mvp-schema.sql           # Base schema
│
└── extension/
    ├── scripts/
    │   ├── auth.js                       # Auth manager (popup only)
    │   ├── background.js                 # Auth handler (always running)
    │   └── content.js                    # Web-extension bridge
    ├── popup/
    │   ├── popup.html                    # Auth screen UI
    │   ├── popup.js                      # Auth check & main UI
    │   └── popup.css                     # Avatar styles
    └── manifest.json                     # Extension config
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-repo/tabkeep/issues
- Email: support@tabkeep.app
- Docs: https://tabkeep.app/docs

---

**Version**: 1.0.0
**Last Updated**: 2026-01-08
**Author**: TabKeep Team
