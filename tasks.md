# Implementation Tasks Checklist

## Phase 0: Infrastructure & Project Setup
- [x] Initialize project directories for open-source components.
- [x] Create basic `interface.md` and `prd.md` for each component.
- [x] Set up `opensource/docker-compose.yml` for local development.
- [x] Create `dev.sh` for multi-component local development with hot-reloading.
- [x] Configure CI/CD skeletons for each component.

## Phase 1: Core Optimization Engine (Python)
- [x] Implement JSON schema validation for input/output payloads (Pydantic).
- [x] Implement CP-SAT model for hard constraints (Double booking, etc.).
- [x] Implement CP-SAT model for soft constraints (Subject balancing, gaps).
- [x] Develop a Flask/FastAPI wrapper for the solver.
- [x] Write integration tests with sample school data.
- [ ] Benchmark performance for various problem sizes.

## Phase 2: Backend API & Gateway (Go)
- [x] Design and implement PostgreSQL database schema (Migrations).
- [x] Implement CRUD endpoints for Teachers, Subjects, and Classes.
- [x] Develop Job Ingestion logic (Snapshotting state).
- [x] Implement Job Status tracking and results retrieval.
- [ ] Integrate JWT authentication and organization scoping.
- [ ] Set up SSE/WebSocket endpoint for real-time status.

## Phase 3: Async Job Queue (Go)
- [x] Configure `hibiken/asynq` or `riverqueue` with the broker.
- [x] Implement worker logic to pull jobs and call the Core Engine.
- [x] Implement concurrency limiting (`MAX_CONCURRENT_SOLVERS`).
- [x] Add error handling and automatic retry logic for solver failures.
- [x] Ensure database state is updated upon job completion/failure.

## Phase 4: Frontend UI (React)
- [x] Set up project with Vite, Tailwind CSS, and TypeScript.
- [x] Build resource management dashboards (Teachers, Subjects, Classes).
- [x] Implement the Scheduler Workspace (Job triggers & Monitoring).
- [x] Develop the Interactive Timetable Grid.
- [x] Implement drag-and-drop manual adjustments with conflict highlighting.
- [x] Connect to Backend API via TanStack Query.
- [x] Implement Import/Export tab for bulk data management (JSON).
- [x] Fix: Missing Job Result API endpoint for timetable visualization.
- [x] Improve: Handle and explain `INFEASIBLE` solver status in the UI.
- [x] Implement: Iterative timetable generation with manual adjustments and pinning.
- [x] Implement: Admin tab with data clearing and import/export management.
- [x] Fix: Sample data import failures due to invalid UUID formats.
- [x] Implement: Save and load timetables with naming and sync status tracking.

## Phase 5: Final Integration & Launch (Core)
- [ ] End-to-end testing of the full flow: UI -> API -> Queue -> Solver -> DB -> UI.
- [ ] Documentation for deployment (Production Dockerfiles, environment variables).
- [ ] Security audit and penetration testing (Internal).
- [ ] Final performance tuning and database indexing.
