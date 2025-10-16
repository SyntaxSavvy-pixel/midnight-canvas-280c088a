# Tabmangment Extension - Build Directory

This directory contains the clean build of the Tabmangment Chrome extension, ready to be loaded into Chrome.

## How to Load This Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select **this folder** (`extension-build/`)
5. The extension should now be loaded and ready to use!

## Important Notes

- **DO NOT** load the parent directory - it contains `node_modules` and other files that will cause loading errors
- **ALWAYS** load this `extension-build` folder specifically
- This folder contains only the necessary extension files without development dependencies

## Version

Current version: **5.4.1**

## Files Included

- `manifest.json` - Extension configuration
- `popup.html/js/css` - Extension popup interface
- `background.js` - Service worker for extension logic
- `content.js` - Content script injected into web pages
- `icons/` - Extension icons
- All other necessary HTML, JS, and CSS files

## Troubleshooting

If you see an error about files starting with `_`:
- Make sure you're loading the `extension-build` folder, not the parent directory
- The parent directory contains Netlify config files that Chrome rejects

If you need to update the extension after code changes:
- Click the refresh icon on the extension card in `chrome://extensions/`
- Or remove and re-add the extension

## Support

For issues or questions, please visit: https://github.com/WEBBULIDERPRO/tabmangment-extension
