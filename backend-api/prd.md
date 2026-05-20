# PRD: Backend API & Gateway

## 1. Overview
The Backend API & Gateway is the central management hub for ChronoSchool. It handles data persistence, resource management, and coordinates the scheduling process by interacting with the Job Queue.

## 2. Technical Stack
- **Language:** Go
- **Database:** PostgreSQL
- **Architecture:** RESTful API
- **Real-time:** Server-Sent Events (SSE) or WebSockets

## 3. Functional Requirements
- **Resource Management (CRUD):**
    - Manage Teachers (name, qualifications, availability).
    - Manage Subjects (name, requirements).
    - Manage Classes (curriculum requirements).
- **Job Orchestration:**
    - Receive scheduling requests.
    - Snapshot the current state of resources.
    - Queue jobs for the Async Job Queue.
    - Track job status (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).
- **Data Persistence:**
    - Maintain the source of truth for all school resources and historical timetables.
- **Tenant Context:**
    - Support multi-tenancy by filtering all data by `organization_id`.

## 4. API Specification
- REST endpoints for all resources.
- Job status polling and real-time streaming for updates.

## 5. Security
- JWT-based authentication.
- Role-Based Access Control (RBAC) (Admin vs. Viewer).

## 6. Verification Criteria
- CRUD operations for all entities must be fully functional.
- Job submission must correctly result in a queued task and a trackable job ID.
- Concurrent requests should be handled gracefully using Go's concurrency primitives.
