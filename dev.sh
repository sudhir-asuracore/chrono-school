#!/bin/bash

# ChronoSchool Open Source Development Script
# This script starts all services in development mode.

# Set colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping all services...${NC}"
    
    # Kill all background processes started by this script
    # Use jobs -p to get PIDs of background jobs
    PIDS=$(jobs -p)
    if [ -n "$PIDS" ]; then
        kill $PIDS 2>/dev/null
    fi
    
    # Stop docker containers
    echo -e "${BLUE}Stopping infrastructure (Docker)...${NC}"
    docker compose stop postgres redis
    
    echo -e "${GREEN}All services stopped.${NC}"
    exit
}

# Trap Ctrl+C (SIGINT) and exit
trap cleanup SIGINT

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   ChronoSchool Open Source Development Environment   ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Start Infrastructure (Postgres, Redis)
echo -e "${YELLOW}1. Starting Infrastructure (Postgres, Redis)...${NC}"
docker compose up -d postgres redis

# Wait for postgres to be ready
echo -e "Waiting for infrastructure to be ready..."
sleep 5

# 2. Start Core Engine (Python)
echo -e "${YELLOW}2. Starting Core Engine (Python)...${NC}"
(
    cd core-engine
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    # Use unbuffered output for Python logs
    PYTHONUNBUFFERED=1 python3 main.py
) &

# 3. Start Backend API (Go)
echo -e "${YELLOW}3. Starting Backend API (Go)...${NC}"
(
    cd backend-api
    go run main.go
) &

# 4. Start Job Queue (Go)
echo -e "${YELLOW}4. Starting Job Queue (Go)...${NC}"
(
    cd job-queue
    export SOLVER_URL=http://localhost:8000
    go run main.go
) &

# 5. Start Frontend UI (Vite)
echo -e "${YELLOW}5. Starting Frontend UI (React/Vite)...${NC}"
(
    cd frontend-ui
    export VITE_API_BASE_URL=http://localhost:8080/api/v1
    npm run dev
) &

echo -e "${GREEN}------------------------------------------------------${NC}"
echo -e "${GREEN}All services are starting up!${NC}"
echo -e "Frontend:    ${BLUE}http://localhost:5173${NC}"
echo -e "Backend API: ${BLUE}http://localhost:8080${NC}"
echo -e "Core Engine: ${BLUE}http://localhost:8000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo -e "${GREEN}------------------------------------------------------${NC}"

# Keep the script running to catch the trap
wait
