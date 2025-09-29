#!/bin/bash

# Test script for the new deployment
# Replace YOUR_NEW_URL with the actual deployment URL from Vercel

echo "Testing Supabase integration..."

# Test user registration
echo "1. Testing user registration..."
curl -X POST "YOUR_NEW_URL/api/me" \
  -H "Content-Type: application/json" \
  -d '{"action":"register","name":"Test User","email":"test@example.com","password":"testpassword123"}' \
  | python3 -m json.tool

echo -e "\n\n2. Testing user lookup..."
curl -s "YOUR_NEW_URL/api/me?email=test@example.com" \
  | python3 -m json.tool

echo -e "\n\nDone! If you see user data above, Supabase integration is working!"