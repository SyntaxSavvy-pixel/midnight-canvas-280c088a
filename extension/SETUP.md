# TabKeep Extension Setup

## Quick Start

### 1. Add Extension Icons

The extension requires icon files in the `assets/icons/` folder. You need to create:

- `icon-16.png` - 16x16 pixels
- `icon-32.png` - 32x32 pixels
- `icon-48.png` - 48x48 pixels
- `icon-128.png` - 128x128 pixels

**Design Guidelines:**
- Use the TabKeep logo (lightning bolt)
- Purple/blue gradient background (#6366F1 to #8B5CF6)
- White icon foreground
- Rounded square shape (8px radius)

**Quick Solution:**
You can use the logo SVG from the HTML file as a reference and export it at different sizes using:
- Figma, Sketch, or Adobe Illustrator
- Online tools like [CloudConvert](https://cloudconvert.com/svg-to-png)
- Command line: `convert logo.svg -resize 16x16 icon-16.png`

### 2. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension` folder from this repository
5. The extension should now appear in your toolbar!

### 3. Test the Extension

1. Click the TabKeep icon in your Chrome toolbar
2. You should see the popup with your current tabs
3. Try the quick actions:
   - Toggle auto-close timer
   - Bookmark all tabs
   - Collapse all tabs (closes all but active)

### 4. Enable Auto-Close

The auto-close feature is enabled by default:
- Inactive tabs are closed after 2 hours
- Pinned tabs are never auto-closed
- Active tab is never auto-closed
- You'll get a notification when tabs are closed

## Development Workflow

1. Make changes to source files
2. Go to `chrome://extensions/`
3. Click the **refresh** icon on the TabKeep extension card
4. Reopen the popup to see your changes

## Troubleshooting

### Extension Won't Load
- Check that all icon files exist
- Verify `manifest.json` is valid JSON
- Check the Chrome developer console for errors

### Popup Not Displaying
- Right-click the extension icon → **Inspect popup**
- Check console for JavaScript errors
- Verify all file paths in HTML are correct

### Auto-Close Not Working
- Check that the feature is enabled (toggle should be active)
- Open `chrome://extensions/` → Click "service worker" → Check logs
- Verify permissions are granted

## Next Steps

Once the extension is working:
1. Customize the auto-close interval in `background.js`
2. Add your own branding to the icons
3. Connect to the TabKeep.app web dashboard
4. Test with real-world browsing patterns

## Production Build

Before publishing to Chrome Web Store:
1. Update version in `manifest.json`
2. Add all required icons
3. Create promotional screenshots
4. Write store description
5. Zip the extension folder
6. Submit to Chrome Web Store

---

Need help? Visit [tabkeep.app/support](https://tabkeep.app/support)
