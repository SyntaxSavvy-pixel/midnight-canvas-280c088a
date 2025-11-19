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

# Icons directory
mkdir -p chrome-store-build/icons
cp icons/icon-16.png chrome-store-build/icons/
cp icons/icon-32.png chrome-store-build/icons/
cp icons/icon-48.png chrome-store-build/icons/
cp icons/icon-128.png chrome-store-build/icons/

echo "✅ Files copied"
echo ""

# List files to be included
echo "📋 Files included in extension:"
find chrome-store-build -type f | sort

echo ""
echo "📊 Total files: $(find chrome-store-build -type f | wc -l)"
echo ""

# Create ZIP using Python (zip command not available)
echo "🗜️ Creating ZIP file..."
cd chrome-store-build
python3 -m zipfile -c ../tabmanagement-extension.zip ./*
cd ..

# Verify ZIP was created
if [ -f "tabmanagement-extension.zip" ]; then
    SIZE=$(du -h tabmanagement-extension.zip | cut -f1)
    echo ""
    echo "✅ ZIP created successfully: tabmanagement-extension.zip ($SIZE)"
    echo ""
    echo "🚀 Ready to upload to Chrome Web Store!"
    echo ""
    echo "⚠️  EXCLUDED (website/backend files):"
    echo "   - user-dashboard.html (website)"
    echo "   - new-authentication.html (website)"
    echo "   - mainlandingpage.html (website)"
    echo "   - All SQL files"
    echo "   - .env file"
    echo "   - functions/ directory"
    echo "   - backend-setup/ directory"
else
    echo "❌ Failed to create ZIP file"
    exit 1
fi
