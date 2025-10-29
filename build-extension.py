#!/usr/bin/env python3
"""
Chrome Extension Build Script
Creates a clean zip file for Chrome Web Store submission
"""

import zipfile
import os
from pathlib import Path

# Files and directories to include in the extension
EXTENSION_FILES = [
    'manifest.json',
    'config.js',
    'background.js',
    'content.js',
    'dashboard-bridge.js',
    'dashboard-sync.js',
    'success-page-activator.js',
    'popup.html',
    'popup.js',
    'popup.css',
]

EXTENSION_DIRS = [
    'icons',
]

def create_extension_zip(output_name='tabmangment-v5.5.0-fixed.zip'):
    """Create a zip file with all extension files"""
    base_dir = Path(__file__).parent
    zip_path = base_dir / output_name

    # Remove old zip if exists
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add individual files
        for file in EXTENSION_FILES:
            file_path = base_dir / file
            if file_path.exists():
                zipf.write(file_path, file)
                print(f'✓ Added: {file}')
            else:
                print(f'⚠ Warning: {file} not found')

        # Add directories
        for dir_name in EXTENSION_DIRS:
            dir_path = base_dir / dir_name
            if dir_path.exists() and dir_path.is_dir():
                for file_path in dir_path.rglob('*'):
                    if file_path.is_file():
                        arcname = file_path.relative_to(base_dir)
                        zipf.write(file_path, arcname)
                        print(f'✓ Added: {arcname}')
            else:
                print(f'⚠ Warning: {dir_name} directory not found')

    # Get file size
    size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f'\n✅ Extension built successfully!')
    print(f'📦 Output: {output_name}')
    print(f'📊 Size: {size_mb:.2f} MB')
    return str(zip_path)

if __name__ == '__main__':
    create_extension_zip()
