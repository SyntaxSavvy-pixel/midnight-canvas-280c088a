#!/bin/bash

# Chrome Web Store Extension Builder
# Only includes extension files, excludes website files

echo "🔨 Building Tabmangment Extension ZIP for Chrome Web Store..."
echo ""

# Create a clean build directory
rm -rf chrome-store-build
mkdir -p chrome-store-build

# Copy ONLY extension files (not website files)
echo "📦 Copying extension files..."

# Core extension files
cp manifest.json chrome-store-build/
cp popup.html chrome-store-build/
cp popup.js chrome-store-build/
cp popup.css chrome-store-build/
cp background.js chrome-store-build/
cp content.js chrome-store-build/
cp extension-simple-auth.js chrome-store-build/
cp config.js chrome-store-build/

# Content scripts for dashboard sync
cp dashboard-sync.js chrome-store-build/
cp dashboard-bridge.js chrome-store-build/
cp success-page-activator.js chrome-store-build/

# Icons
cp -r icons chrome-store-build/

# Extension libraries (if they exist)
if [ -d "lib" ]; then
    cp -r lib chrome-store-build/
fi

echo "✅ Files copied"
echo ""

# Create ZIP
cd chrome-store-build
zip -r ../tabmangment-extension-v5.5.0.zip . -x "*.DS_Store" "*.git*"
cd ..

echo ""
echo "✅ ZIP created: tabmangment-extension-v5.5.0.zip"
echo ""
echo "📊 Contents:"
unzip -l tabmangment-extension-v5.5.0.zip

echo ""
echo "🚀 Ready to upload to Chrome Web Store!"
echo ""
echo "⚠️  EXCLUDED (website files, not extension):"
echo "   - user-dashboard.html"
echo "   - New-authentication.html"
echo "   - All other HTML pages"
echo "   - netlify/ directory"
