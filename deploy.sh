#!/bin/bash

# 🚀 TabManagement Deployment Script
# This script automates the deployment process to Vercel

echo "🚀 Starting TabManagement deployment..."

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

# Check if git is initialized
if [ ! -d ".git" ]; then
    print_error "Git repository not initialized. Please run 'git init' first."
    exit 1
fi

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_warning "You have uncommitted changes. Committing them now..."

    # Add all files
    git add .

    # Get commit message from user or use default
    read -p "Enter commit message (or press Enter for default): " commit_msg
    if [ -z "$commit_msg" ]; then
        commit_msg="🚀 Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
    fi

    # Commit changes
    git commit -m "$commit_msg"
    print_success "Changes committed successfully!"
fi

# Push to GitHub if remote exists
if git remote | grep -q "origin"; then
    print_status "Pushing to GitHub..."
    git push origin main || git push origin master
    print_success "Code pushed to GitHub!"
else
    print_warning "No GitHub remote found. Please set up your GitHub repository first."
    echo "Run: git remote add origin https://github.com/yourusername/tabmanagement.git"
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if already logged in to Vercel
if ! vercel whoami &> /dev/null; then
    print_status "Please log in to Vercel..."
    vercel login
fi

# Deploy to Vercel
print_status "Deploying to Vercel..."

# Ask user for deployment type
echo ""
echo "Choose deployment type:"
echo "1. Preview deployment (staging)"
echo "2. Production deployment"
read -p "Enter your choice (1 or 2): " deploy_choice

case $deploy_choice in
    1)
        print_status "Deploying to preview environment..."
        vercel
        ;;
    2)
        print_status "Deploying to production..."
        vercel --prod
        ;;
    *)
        print_error "Invalid choice. Defaulting to preview deployment..."
        vercel
        ;;
esac

# Check deployment status
if [ $? -eq 0 ]; then
    print_success "🎉 Deployment completed successfully!"

    echo ""
    echo "📋 Next Steps:"
    echo "1. Test your application at the provided URL"
    echo "2. Set up custom domain in Vercel dashboard (optional)"
    echo "3. Configure environment variables for production"
    echo "4. Set up monitoring and analytics"

    echo ""
    echo "🔗 Useful Links:"
    echo "• Vercel Dashboard: https://vercel.com/dashboard"
    echo "• Project Settings: Check deployment URL for settings link"
    echo "• Documentation: See DEPLOYMENT.md for detailed guide"

else
    print_error "Deployment failed. Please check the error messages above."
    exit 1
fi

echo ""
print_success "✨ TabManagement is now live! Happy tab managing! ✨"