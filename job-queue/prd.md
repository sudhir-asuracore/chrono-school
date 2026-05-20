# PRD: Async Job Queue

## 1. Overview
The Async Job Queue handles the asynchronous execution of long-running optimization tasks. It prevents the Backend API from blocking and ensures that system resources are used efficiently.

## 2. Technical Stack
- **Language:** Go
- **Queue Broker:** Redis (using `hibiken/asynq`) or PostgreSQL (using `riverqueue`)
- **Worker Logic:** Go workers that call the Python Core Engine via HTTP or local execution.

## 3. Functional Requirements
- **Job Consumption:**
    - Listen for new job assignments.
    - Fetch complete problem descriptions (snapshots).
- **Worker Lifecycle:**
    - Trigger the Core Optimization Engine.
    - Handle timeouts and process crashes.
    - Retry logic for transient failures.
- **State Reporting:**
    - Update the database with job progress and final results.
    - Capture and store solver logs/errors for diagnostic purposes.
- **Resource Management:**
    - Enforce `MAX_CONCURRENT_SOLVERS` to prevent CPU exhaustion.

## 4. Operational Requirements
- **Observability:** Metrics on queue depth, processing time, and failure rates.
- **Concurrency Control:** Configurable worker pools.

## 5. Verification Criteria
- Simulation of high load (multiple simultaneous job submissions).
- Verification that workers correctly transition jobs from `PROCESSING` to `COMPLETED` or `FAILED`.
- Confirmation that resource limits (concurrency) are respected.
