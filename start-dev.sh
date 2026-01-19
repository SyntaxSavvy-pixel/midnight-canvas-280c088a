#!/bin/bash

# TabKeep Development Server
# Starts both the API server and the frontend

echo ""
echo "=========================================="
echo "       TabKeep Development Server        "
echo "=========================================="
echo ""

# Kill any existing processes on ports 3000 and 5173
echo "Checking for existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start API server in background
echo "Starting API server on port 3000..."
node dev-api-server.js &
API_PID=$!

# Wait a bit for API server to start
sleep 2

# Start frontend server
echo "Starting frontend on port 5173..."
cd midnight-canvas-280c088a.backup
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=========================================="
echo "  Servers Running:                       "
echo "  - API:      http://localhost:3000      "
echo "  - Frontend: http://localhost:5173      "
echo "=========================================="
echo ""
echo "Configure your API keys in Settings (gear icon)"
echo "Press Ctrl+C to stop both servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $API_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    echo "Servers stopped!"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
