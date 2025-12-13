#!/bin/bash

echo "🚀 Starting Student Portal Full Stack Application..."
echo

# Check if we're in the right directory
if [ ! -f "server/package.json" ]; then
    echo "❌ Error: Please run this script from the root directory of Student_Portal-CLEAN"
    exit 1
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        return 0
    fi
}


# Check ports
check_port 5000 || echo "Backend port 5000 in use"
check_port 3000 || echo "Frontend port 3000 in use" 
check_port 5001 || echo "Flask API port 5001 in use"

# Start Node.js Backend
echo "🌐 Starting Node.js backend server..."
(
    cd server
    npx nodemon app.js 
)&
BACKEND_PID=$!

# Wait for backend to start
sleep 3

echo "-----------------------------------------"
# Start React Frontend  
echo "⚛️ Starting React frontend..."
(
    cd client
    npm start
)&
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

echo "-----------------------------------------"
# Start Flask API
echo "🐍 Starting Flask API..."
(
    cd scripts/google-docs

    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi

    # Activate virtual environment
    source venv/bin/activate

    # Install dependencies
    pip install --upgrade pip
    pip install -r requirements.txt

    #start Flask API
    python3 docs_api.py
)&
FLASK_PID=$!

# Deactivate virtual environment and return to root
deactivate
cd ../..

echo "-----------------------------------------"
echo
echo "✅ All services are starting up!"
echo
echo "📊 Backend:    http://localhost:5000"
echo "⚛️ Frontend:   http://localhost:3000"
echo "🐍 Flask API:  http://localhost:5001"
echo
echo "💡 To stop all services, press Ctrl+C"

# Function to cleanup processes on exit
cleanup() {
    echo
    echo "🛑 Stopping all services..."
    kill $BACKEND_PID $FRONTEND_PID $FLASK_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Keep script running
wait