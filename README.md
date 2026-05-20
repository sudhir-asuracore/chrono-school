# ChronoSchool Open-Source

This directory contains the core components of the ChronoSchool project.

## Components
- **[core-engine](./core-engine):** Python solver using OR-Tools.
- **[backend-api](./backend-api):** Go API for resource management.
- **[job-queue](./job-queue):** Async worker for handling solving jobs.
- **[frontend-ui](./frontend-ui):** React dashboard for users.

## Running with Docker Compose
You can spin up the entire open-source stack using:
```bash
docker compose up --build
```
This will start the components along with PostgreSQL and Redis.

## Local Development
For active development where you want hot-reloading (frontend) and local execution, use the provided development script:
```bash
./dev.sh
```
This script will:
1. Start PostgreSQL and Redis in Docker.
2. Start all backend services locally in the background.
3. Start the frontend Vite server in dev mode.
4. Stop all processes and containers when you press `Ctrl+C`.

## Documentation
- [PRD](prd.md)
- [Tasks](tasks.md)
