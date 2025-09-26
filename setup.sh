#!/bin/bash

# Tabmangment Extension - GitHub & Vercel Setup Script
# Run this script to set up the project for deployment

set -e

echo "🚀 Setting up Tabmangment for GitHub and Vercel deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "manifest.json" ]]; then
    print_error "manifest.json not found. Please run this script from the Tabmangment directory."
    exit 1
fi

print_status "Checking project structure..."

# Check required files
required_files=("manifest.json" "popup.html" "popup.js" "popup.css" "background.js" "README.md" "package.json")
for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        print_success "✓ $file"
    else
        print_error "✗ Missing $file"
        exit 1
    fi
done

print_status "Checking API directory structure..."
if [[ -d "api/stripe" ]]; then
    print_success "✓ API directory structure exists"
    ls -la api/stripe/
else
    print_error "✗ API directory missing"
    exit 1
fi

print_status "Installing dependencies..."
if command -v npm &> /dev/null; then
    npm install
    print_success "Dependencies installed"
else
    print_warning "npm not found. Please install Node.js and npm."
fi

print_status "Initializing git repository..."
if [[ ! -d ".git" ]]; then
    git init
    git add .
    git commit -m "Initial commit: Tabmangment Chrome Extension with Stripe integration"
    print_success "Git repository initialized"
else
    print_warning "Git repository already exists"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Create GitHub repository:"
echo "   - Go to https://github.com/new"
echo "   - Name: tabmangment"
echo "   - Make it public"
echo ""
echo "2. Push to GitHub:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/tabmangment.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Deploy to Vercel:"
echo "   npx vercel"
echo "   # Follow the prompts to link to GitHub and deploy"
echo ""
echo "4. Configure Stripe webhooks:"
echo "   - Go to https://dashboard.stripe.com/webhooks"
echo "   - Add endpoint: https://your-vercel-url.vercel.app/api/stripe/webhook"
echo "   - Select events: invoice.payment_succeeded, customer.subscription.*, charge.dispute.created"
echo ""
echo "5. Update extension configuration:"
echo "   - Edit popup.js line 3411"
echo "   - Replace 'https://api.tabmangment.com' with your Vercel URL"
echo ""
echo "6. Set Vercel environment variables:"
echo "   STRIPE_SECRET_KEY=sk_live_..."
echo "   STRIPE_WEBHOOK_SECRET=whsec_..."
echo "   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_..."
echo ""
echo "📚 See DEPLOYMENT.md for detailed instructions!"