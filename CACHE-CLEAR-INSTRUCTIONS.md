# Clear Browser Cache for Dashboard

The browser is caching the old dashboard-bridge.js file. Follow these steps:

## Method 1: Hard Refresh (Try this first)
1. Open the dashboard: https://tabmangment.netlify.app/user-dashboard.html
2. Open DevTools: F12 or Right-click → Inspect
3. **Right-click the refresh button** (next to address bar)
4. Select **"Empty Cache and Hard Reload"**
5. Check console for: `🌉 Dashboard Bridge v2.1 loaded`

## Method 2: Clear Site Data (If Method 1 doesn't work)
1. Open DevTools (F12)
2. Go to **Application** tab
3. In left sidebar, click **Storage**
4. Click **"Clear site data"** button
5. Refresh page (Ctrl+Shift+R or Cmd+Shift+R)
6. Check console for: `🌉 Dashboard Bridge v2.1 loaded`

## Method 3: Incognito/Private Window (To test without cache)
1. Open **Incognito/Private browsing** window
2. Install extension in incognito (if needed)
3. Go to dashboard
4. Should load fresh files without cache

## Verify It Worked:
In the console, you should see:
```
🌉 Dashboard Bridge v2.1 loaded
```

NOT:
```
🌉 Dashboard Bridge v2.0 loaded
```
or
```
🌉 Dashboard Bridge loaded
```

If you still see the old version, the cache hasn't cleared yet.

## Alternative: Update Netlify Deployment
If cache persists, the issue might be on Netlify's side. You need to:
1. Commit changes to git
2. Push to repository
3. Wait for Netlify to rebuild
4. Check deployment logs show new version deployed
